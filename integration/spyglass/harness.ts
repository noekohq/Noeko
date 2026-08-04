import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "bun:test";
import { StringRecordId } from "surrealdb";
import { Idea } from "../../app/database/models/ideas";
import { ISpyglassRecord, SpyglassRecord } from "../../app/database/models/spyglass_record";
import { closeDatabaseConnection, getDatabase, initDatabase } from "../../app/database/db";
import { initServices } from "../../app/services";
import Spyglass, { IFinding, IGlimpseResult, ISpyglassIntent } from "../../app/services/Spyglass";
import { IConnectable, IConnectableFields } from "../../app/services/Graph";
import { Search } from "../../app/services/Search";
import { createUser } from "../../tests/helpers/factories";
import { SPYGLASS_LIVE_QUERY, SPYGLASS_SEED_NOTES, SPYGLASS_SEMANTIC_QUERY } from "./fixtures";

type SpyglassEvent = {
  type: string;
  data: unknown;
};

type TraceEntry = {
  type: string;
  elapsedMs: number;
  summary: string;
};

export type LiveRunResult = {
  mode: "glimpse" | "deep";
  query: string;
  durationMs: number;
  trace: TraceEntry[];
  intent?: ISpyglassIntent;
  resources: IConnectableFields[];
  fullResults: IConnectable[];
  findings: IFinding[];
  overview: string;
  glimpseRaw: string;
  glimpse?: IGlimpseResult;
  savedRecord?: ISpyglassRecord;
};

export type SpyglassLiveContext = {
  userId: string;
  noteIdsByKey: Record<string, string>;
  createdIdeaIds: string[];
  createdRecordIds: string[];
};

const LIVE_USER_PREFIX = "spyglasslive";
const TRACE_OUTPUT_DIR = join(process.cwd(), "test-results", "spyglass-live");

const assertSafeEnvironment = () => {
  const database = process.env.DB_DATABASE;
  if (!database?.endsWith("_test")) {
    throw new Error(
      `Refusing to run live Spyglass integration against "${database ?? "<undefined>"}". ` +
        "DB_DATABASE must end in _test."
    );
  }
  if (process.env.LM_PROVIDER !== "openai") {
    throw new Error("LM_PROVIDER must be openai for the live Spyglass integration suite.");
  }
  if (process.env.EMBEDDINGS_PROVIDER !== "openai") {
    throw new Error("EMBEDDINGS_PROVIDER must be openai for the live Spyglass integration suite.");
  }
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "mock-api-key") {
    throw new Error("A real OPENAI_API_KEY is required for the live Spyglass integration suite.");
  }
};

const summarizeEvent = (event: SpyglassEvent) => {
  if (typeof event.data === "string") {
    return `${event.data.length} chars: ${event.data.slice(0, 100)}`;
  }
  if (Array.isArray(event.data)) {
    return `${event.data.length} items`;
  }
  if (event.data && typeof event.data === "object") {
    return Object.keys(event.data).join(", ");
  }
  return String(event.data);
};

const normalizeEvidence = (value: string) =>
  value
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const setupSpyglassLiveContext = async (): Promise<SpyglassLiveContext> => {
  assertSafeEnvironment();
  await initDatabase();
  await initServices();

  const suffix = Bun.randomUUIDv7().replaceAll("-", "").slice(-12);
  const userId = `user:${LIVE_USER_PREFIX}${suffix}`;
  const user = await createUser({
    id: new StringRecordId(userId),
    email: `${LIVE_USER_PREFIX}-${suffix}@example.com`,
    settings: { isNew: false },
  });

  const noteIdsByKey: Record<string, string> = {};
  const createdIdeaIds: string[] = [];

  for (const note of SPYGLASS_SEED_NOTES) {
    const idea = await Idea.create(
      {
        title: note.title,
        content: note.content,
        visibility: "private",
        embeddings: null,
      },
      user.id,
      { omitDerived: true }
    );
    if (!idea) {
      throw new Error(`Failed to seed Spyglass live note "${note.title}".`);
    }
    if (idea.embeddingsStatus !== "ready" || !idea.embeddings?.length) {
      throw new Error(`OpenAI embeddings were not persisted for "${note.title}".`);
    }
    noteIdsByKey[note.key] = idea.id.toString();
    createdIdeaIds.push(idea.id.toString());
  }

  return {
    userId,
    noteIdsByKey,
    createdIdeaIds,
    createdRecordIds: [],
  };
};

export const cleanupSpyglassLiveContext = async (context?: SpyglassLiveContext) => {
  if (!context) {
    await closeDatabaseConnection();
    return;
  }

  const db = await getDatabase();
  for (const id of context.createdRecordIds) {
    await db?.delete(new StringRecordId(id));
  }
  for (const id of context.createdIdeaIds) {
    await Idea.delete(id);
  }
  await db?.query("DELETE owns WHERE in = $userId OR out = $userId", {
    userId: new StringRecordId(context.userId),
  });
  await db?.delete(new StringRecordId(context.userId));
  await closeDatabaseConnection();
};

export const verifySemanticPreflight = async (context: SpyglassLiveContext) => {
  const results =
    (await Search.searchConnectables(context.userId, {
      query: SPYGLASS_SEMANTIC_QUERY,
      tables: ["idea"],
      searchType: { fts: false, vector: true },
      vectorSettings: { threshold: 0.35, effort: "high" },
      limit: 10,
    })) ?? [];

  const resultIds = new Set(results.map((result) => result.id.toString()));
  const relevantIds = SPYGLASS_SEED_NOTES.filter((note) => note.relevant).map(
    (note) => context.noteIdsByKey[note.key]
  );
  const matchedRelevantIds = relevantIds.filter((id) => resultIds.has(id));

  expect(results.length).toBeGreaterThan(0);
  expect(matchedRelevantIds.length).toBeGreaterThanOrEqual(2);

  return {
    query: SPYGLASS_SEMANTIC_QUERY,
    resultIds: [...resultIds],
    relevantIds,
    matchedRelevantIds,
  };
};

const assertOrderedPhases = (trace: TraceEntry[], phases: string[]) => {
  let previousIndex = -1;
  for (const phase of phases) {
    const index = trace.findIndex((entry, candidateIndex) => {
      return candidateIndex > previousIndex && entry.type === phase;
    });
    expect(index, `Missing or out-of-order Spyglass phase: ${phase}`).toBeGreaterThan(
      previousIndex
    );
    previousIndex = index;
  }
};

const validateGroundedFindings = (result: LiveRunResult) => {
  const resources = new Map(result.resources.map((resource) => [resource.id.toString(), resource]));
  for (const finding of result.findings) {
    const source = resources.get(finding.sourceId);
    expect(source, `Finding referenced unloaded source ${finding.sourceId}`).toBeDefined();
    const sourceText = normalizeEvidence(`${source?.name ?? ""} ${source?.content ?? ""}`);
    const excerpt = normalizeEvidence(finding.excerpt);
    expect(excerpt.length).toBeGreaterThan(0);
    expect(
      sourceText.includes(excerpt),
      `Finding excerpt was not grounded in ${finding.sourceId}: "${finding.excerpt}"`
    ).toBe(true);
  }
};

const validateCitations = (result: LiveRunResult) => {
  const citations = [...result.overview.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  expect(citations.length).toBeGreaterThan(0);
  for (const citation of citations) {
    expect(citation).toBeGreaterThanOrEqual(1);
    expect(citation).toBeLessThanOrEqual(result.findings.length);
  }
};

const validateGlimpse = (result: LiveRunResult) => {
  const glimpse = JSON.parse(result.glimpseRaw) as IGlimpseResult;
  result.glimpse = glimpse;
  expect(glimpse.summary.trim().length).toBeGreaterThan(20);
  expect(glimpse.contentMap.length).toBeGreaterThan(0);

  const loadedIds = new Set(result.resources.map((resource) => resource.id.toString()));
  const referencedIds = glimpse.contentMap.flatMap((section) =>
    section.results.map((item) => item.resourceId)
  );
  expect(referencedIds.length).toBeGreaterThan(0);
  for (const id of referencedIds) {
    expect(loadedIds.has(id), `Glimpse referenced unloaded resource ${id}`).toBe(true);
  }
  if (glimpse.entryPoint) {
    expect(loadedIds.has(glimpse.entryPoint.resourceId)).toBe(true);
  }
};

const persistAndReplay = async (context: SpyglassLiveContext, result: LiveRunResult) => {
  const record = await SpyglassRecord.create(context.userId, {
    baseQuery: result.query,
    scope: result.resources.map((resource) => new StringRecordId(resource.id)),
    searchPerformed: true,
    isDeepAnalysis: result.mode === "deep",
    intent: result.intent,
    findings: result.findings,
    overview: result.mode === "deep" ? result.overview : result.glimpseRaw,
  });
  expect(record).toBeDefined();
  context.createdRecordIds.push(record!.id.toString());

  const replay = await SpyglassRecord.getById(record!.id.toString());
  expect(replay?.baseQuery).toBe(result.query);
  expect(replay?.scope.length).toBe(result.resources.length);
  expect(replay?.isDeepAnalysis).toBe(result.mode === "deep");

  const history = await SpyglassRecord.getHistoryLightweight(context.userId, 1, 20);
  expect(history?.history.some((item) => item.id.toString() === record!.id.toString())).toBe(true);
  result.savedRecord = replay ?? undefined;
};

export const runAndVerifySpyglass = async (
  context: SpyglassLiveContext,
  mode: "glimpse" | "deep"
): Promise<LiveRunResult> => {
  const startedAt = Date.now();
  const result: LiveRunResult = {
    mode,
    query: SPYGLASS_LIVE_QUERY,
    durationMs: 0,
    trace: [],
    resources: [],
    fullResults: [],
    findings: [],
    overview: "",
    glimpseRaw: "",
  };

  try {
    const generator = Spyglass.runAnalysisGenerator({
      userId: context.userId,
      query: SPYGLASS_LIVE_QUERY,
      deepAnalysis: mode === "deep",
    });

    for await (const rawEvent of generator) {
      const event = rawEvent as SpyglassEvent;
      const entry: TraceEntry = {
        type: event.type,
        elapsedMs: Date.now() - startedAt,
        summary: summarizeEvent(event),
      };
      result.trace.push(entry);
      if (event.type !== "overview_chunk" && event.type !== "glimpse_chunk") {
        console.info(
          `[Spyglass live:${mode}] +${entry.elapsedMs}ms ${entry.type} — ${entry.summary}`
        );
      }

      switch (event.type) {
        case "intent_loaded":
          result.intent = event.data as ISpyglassIntent;
          break;
        case "resources_loaded":
          result.resources = event.data as IConnectableFields[];
          break;
        case "full_results_loaded":
          result.fullResults = event.data as IConnectable[];
          break;
        case "findings_chunk":
          result.findings.push(...(event.data as IFinding[]));
          break;
        case "overview_chunk":
          result.overview += event.data as string;
          break;
        case "glimpse_chunk":
          result.glimpseRaw += event.data as string;
          break;
        case "completed":
          console.info(
            `[Spyglass live:${mode}] +${entry.elapsedMs}ms completed — ` +
              `${result.findings.length} findings, ${result.overview.length} overview chars, ` +
              `${result.glimpseRaw.length} glimpse chars`
          );
          break;
        case "error":
          throw new Error(`Spyglass emitted an error event: ${String(event.data)}`);
      }
    }

    result.durationMs = Date.now() - startedAt;
    const commonPhases = ["status", "intent_loaded", "resources_loaded", "full_results_loaded"];
    assertOrderedPhases(
      result.trace,
      mode === "deep"
        ? [...commonPhases, "findings_chunk", "overview_chunk", "completed"]
        : [...commonPhases, "glimpse_chunk", "completed"]
    );

    expect(result.intent?.searches.length).toBeGreaterThan(0);
    expect(result.resources.length).toBeGreaterThan(0);
    expect(result.fullResults.length).toBe(result.resources.length);

    const loadedIds = new Set(result.resources.map((resource) => resource.id.toString()));
    const relevantSeedIds = SPYGLASS_SEED_NOTES.filter((note) => note.relevant).map(
      (note) => context.noteIdsByKey[note.key]
    );
    expect(relevantSeedIds.filter((id) => loadedIds.has(id)).length).toBeGreaterThanOrEqual(2);

    if (mode === "deep") {
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.overview.trim().length).toBeGreaterThan(40);
      validateGroundedFindings(result);
      validateCitations(result);
    } else {
      validateGlimpse(result);
    }

    await persistAndReplay(context, result);
    return result;
  } finally {
    result.durationMs = Date.now() - startedAt;
    await writeLiveArtifact(`${mode}-latest.json`, result);
  }
};

export const writeLiveArtifact = async (name: string, data: unknown) => {
  await mkdir(TRACE_OUTPUT_DIR, { recursive: true });
  await Bun.write(join(TRACE_OUTPUT_DIR, name), JSON.stringify(data, null, 2));
};
