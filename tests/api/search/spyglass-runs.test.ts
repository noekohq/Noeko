import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../app/index";
import { getDatabase } from "../../../app/database/db";
import { SpyglassRunModel } from "../../../app/database/models/spyglass_run";
import Spyglass from "../../../app/services/Spyglass";
import { SpyglassRunWorker, spyglassRunWorker } from "../../../app/services/SpyglassRunWorker";
import { authRequest } from "../../helpers/context";

void app;

const completedGenerator = async function* (label = "alpha") {
  yield { type: "status", data: "Searching durable fixtures..." };
  yield {
    type: "intent_loaded",
    data: { interpretation: label, searches: [] },
  };
  yield { type: "resources_loaded", data: [] };
  yield { type: "full_results_loaded", data: [] };
  yield {
    type: "findings_chunk",
    data: [{ statement: `${label} finding`, sources: [] }],
  };
  yield { type: "overview_chunk", data: `${label} ` };
  yield { type: "overview_chunk", data: "overview" };
  yield {
    type: "completed",
    data: { overview: "", findings: [], results: [] },
  };
};

const waitForRun = async (
  id: string,
  predicate: (status: string) => boolean,
  timeoutMs = 3_000
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await SpyglassRunModel.getById(id);
    if (run && predicate(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for Spyglass run ${id}`);
};

describe("Durable Spyglass runs", () => {
  beforeEach(async () => {
    await spyglassRunWorker.waitForIdle();
    const db = await getDatabase();
    await db!.query(`
      DELETE spyglass_run_event;
      DELETE owns WHERE out IN (SELECT VALUE id FROM spyglass_run);
      DELETE spyglass_run;
    `);
  });

  afterEach(async () => {
    await spyglassRunWorker.waitForIdle();
    vi.restoreAllMocks();
  });

  it("finishes and persists Deep Focus output without a client stream", async () => {
    vi.spyOn(Spyglass, "runAnalysisGenerator").mockImplementation((() =>
      completedGenerator()) as typeof Spyglass.runAnalysisGenerator);

    const response = await authRequest().post("/api/search/spyglass/runs").send({
      query: "What is durable?",
      deepAnalysis: true,
    });

    expect(response.status).toBe(202);
    const run = await waitForRun(response.body.data.id, (status) => status === "completed");
    expect(run.overview).toBe("alpha overview");
    expect(run.findings).toHaveLength(1);
    expect(run.lastEventSequence).toBeGreaterThan(5);
  });

  it("replays only events after a reconnect cursor", async () => {
    vi.spyOn(Spyglass, "runAnalysisGenerator").mockImplementation((() =>
      completedGenerator()) as typeof Spyglass.runAnalysisGenerator);
    const created = await authRequest().post("/api/search/spyglass/runs").send({
      query: "Replay this run",
      deepAnalysis: true,
    });
    await waitForRun(created.body.data.id, (status) => status === "completed");

    const response = await authRequest().get(
      `/api/search/spyglass/runs/${created.body.data.id}/events?after=3`
    );

    expect(response.status).toBe(200);
    expect(response.text).toContain("id: 4");
    expect(response.text).not.toContain("id: 3\n");
    expect(response.text).toContain('"type":"completed"');
  });

  it("allows concurrent runs to complete independently", async () => {
    vi.spyOn(Spyglass, "runAnalysisGenerator").mockImplementation(((args: { query: string }) =>
      completedGenerator(args.query)) as typeof Spyglass.runAnalysisGenerator);
    const [first, second] = await Promise.all([
      authRequest().post("/api/search/spyglass/runs").send({
        query: "first",
        deepAnalysis: true,
      }),
      authRequest().post("/api/search/spyglass/runs").send({
        query: "second",
        deepAnalysis: true,
      }),
    ]);

    const [firstRun, secondRun] = await Promise.all([
      waitForRun(first.body.data.id, (status) => status === "completed"),
      waitForRun(second.body.data.id, (status) => status === "completed"),
    ]);
    expect(firstRun.overview).toBe("first overview");
    expect(secondRun.overview).toBe("second overview");
  });

  it("cooperatively cancels an active run and records the terminal event", async () => {
    vi.spyOn(Spyglass, "runAnalysisGenerator").mockImplementation(async function* () {
      for (let index = 0; index < 100; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        yield { type: "overview_chunk", data: `${index}` };
      }
      yield { type: "completed", data: {} };
    } as typeof Spyglass.runAnalysisGenerator);
    const created = await authRequest().post("/api/search/spyglass/runs").send({
      query: "Cancel this",
      deepAnalysis: true,
    });
    await waitForRun(created.body.data.id, (status) => status === "running");

    const cancelled = await authRequest().post(
      `/api/search/spyglass/runs/${created.body.data.id}/cancel`
    );
    expect(cancelled.status).toBe(202);

    const run = await waitForRun(created.body.data.id, (status) => status === "cancelled");
    const events = await SpyglassRunModel.getEventsAfter(run.id, 0);
    expect(events.at(-1)?.type).toBe("cancelled");
  });

  it("persists worker failures so they can be inspected after disconnect", async () => {
    vi.spyOn(Spyglass, "runAnalysisGenerator").mockImplementation(async function* () {
      yield { type: "status", data: "Starting..." };
      yield { type: "error", data: "Deterministic provider failure" };
    } as typeof Spyglass.runAnalysisGenerator);
    const created = await authRequest().post("/api/search/spyglass/runs").send({
      query: "Fail durably",
      deepAnalysis: true,
    });

    const run = await waitForRun(created.body.data.id, (status) => status === "failed");
    expect(run.error).toBe("Deterministic provider failure");

    const history = await authRequest().get(
      "/api/search/spyglass/history/light?page=1&pageSize=10"
    );
    expect(history.body.data.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.data.id,
          status: "failed",
        }),
      ])
    );
  });

  it("resets partial output when a new worker recovers an expired lease", async () => {
    const run = await SpyglassRunModel.create({
      userId: "user:test",
      query: "Recover this run",
      configuration: {},
    });
    await SpyglassRunModel.claim(run.id, "abandoned-worker", new Date(Date.now() - 1_000));
    await SpyglassRunModel.applyEvent(run.id, "overview_chunk", "abandoned output");
    await SpyglassRunModel.appendEvent(run.id, "overview_chunk", "abandoned output");

    const recoveringWorker = new SpyglassRunWorker(() => completedGenerator("recovered"), 1_000);
    await recoveringWorker.process(run.id);

    const recovered = await SpyglassRunModel.getById(run.id);
    const events = await SpyglassRunModel.getEventsAfter(run.id, 0);
    expect(recovered?.status).toBe("completed");
    expect(recovered?.overview).toBe("recovered overview");
    expect(recovered?.overview).not.toContain("abandoned");
    expect(events.some((event) => event.type === "reset")).toBe(true);
  });
});
