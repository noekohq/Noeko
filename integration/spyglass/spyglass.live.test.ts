import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  cleanupSpyglassLiveContext,
  runAndVerifySpyglass,
  setupSpyglassLiveContext,
  SpyglassLiveContext,
  verifySemanticPreflight,
  writeLiveArtifact,
} from "./harness";

describe("Spyglass live OpenAI integration", () => {
  let context: SpyglassLiveContext | undefined;

  beforeAll(async () => {
    context = await setupSpyglassLiveContext();
  }, 360_000);

  afterAll(async () => {
    await cleanupSpyglassLiveContext(context);
  });

  test("retrieves the controlled note set with real OpenAI embeddings", async () => {
    const report = await verifySemanticPreflight(context!);
    await writeLiveArtifact("semantic-preflight-latest.json", report);
    expect(report.matchedRelevantIds.length).toBeGreaterThanOrEqual(2);
  }, 360_000);

  test("steps through a complete Fast/Glimpse run and replays the saved record", async () => {
    const result = await runAndVerifySpyglass(context!, "glimpse");
    expect(result.glimpse?.contentMap.length).toBeGreaterThan(0);
    expect(result.savedRecord).toBeDefined();
  }, 900_000);

  test("steps through a complete Deep Focus run with grounded citations and replay", async () => {
    const result = await runAndVerifySpyglass(context!, "deep");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.overview).toMatch(/\[\d+\]/);
    expect(result.savedRecord).toBeDefined();
  }, 900_000);
});
