import request from "supertest";
import { app } from "../../../app/index";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { authRequest } from "../../helpers/context";
import { Idea } from "../../../app/database/models/ideas";
import { getDatabase } from "../../../app/database/db";

vi.mock("../../../app/ai/embeddings/embeddings", () => ({
  getEmbedder: vi.fn(() => {
    const vector = (content: string) => {
      const normalized = content.toLowerCase();
      const result = new Array(768).fill(0);

      if (normalized.includes("sourdough starter") || normalized.includes("care for wild yeast")) {
        result[0] = 1;
      } else if (normalized.includes("adjacent fermentation")) {
        result[0] = 0.8;
        result[1] = 0.6;
      } else if (normalized.includes("quarterly budget")) {
        result[1] = 1;
      } else if (
        normalized.includes("orchard field notes") ||
        normalized.includes("fruit tree stewardship") ||
        normalized === "orchard"
      ) {
        result[2] = 1;
      } else if (normalized.includes("orchard bookkeeping")) {
        result[3] = 1;
      } else {
        result[767] = 1;
      }

      return result;
    };

    return {
      provider: "test",
      model: "phrase-aware-test-model",
      dimension: 768,
      supportsBatch: true,
      embedContent: vi.fn(async (content: string) => vector(content)),
      embedContents: vi.fn(async (contents: string[]) => contents.map(vector)),
      getEmptyEmbeddings: vi.fn(async (dimension = 768) => new Array(dimension).fill(0)),
      listAvailableModels: vi.fn(async () => ["phrase-aware-test-model"]),
    };
  }),
}));

describe("Search Router", () => {
  const createdIdeaIds: string[] = [];
  const fixtureTitles = [
    "Sourdough starter routine",
    "Adjacent fermentation note",
    "Quarterly budget",
    "Orchard field notes",
    "Orchard bookkeeping",
    "Fruit tree stewardship",
  ];

  const deleteFixtureIdeas = async () => {
    const db = await getDatabase();
    const [ideas] = await db!.query<[{ id: { toString(): string } }[]]>(
      "SELECT id FROM idea WHERE title IN $titles",
      { titles: fixtureTitles }
    );

    for (const idea of ideas) {
      await Idea.delete(idea.id.toString());
    }
  };

  const createSearchIdea = async (title: string, content: string) => {
    const idea = await Idea.create(
      {
        title,
        content: `<p>${content}</p>`,
        visibility: "private",
      },
      "user:test",
      { omitDerived: true }
    );

    expect(idea).toBeDefined();
    createdIdeaIds.push(idea!.id.toString());
    return idea!;
  };

  const searchEventually = async (
    body: Record<string, unknown>,
    isReady: (results: any[]) => boolean
  ) => {
    let response = await authRequest().post("/api/search").send(body);

    for (let attempt = 0; attempt < 40 && !isReady(response.body.data ?? []); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      response = await authRequest().post("/api/search").send(body);
    }

    return response;
  };

  beforeEach(async () => {
    await deleteFixtureIdeas();
  });

  afterEach(async () => {
    for (const id of createdIdeaIds.splice(0)) {
      await Idea.delete(id);
    }
  });

  describe("POST /api/search", () => {
    it("Rejects unauthenticated requests", async () => {
      const response = await request(app).post("/api/search").send({
        query: "test",
      });

      expect(response.status).toBe(401);
    });

    it("Accepts authenticated requests", async () => {
      const response = await authRequest().post("/api/search").send({
        query: "test",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Succesfully searched");
    });

    it("Returns results from seeded onboarding data", async () => {
      const response = await authRequest().post("/api/search").send({
        query: "Mission",
      });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      const titles = response.body.data.map((r: any) => r.value.title);
      expect(titles).toContain("Noeko’s Mission");
    });

    it("Returns results for ideas created in previous tests (Persistence Check)", async () => {
      // This depends on tests/api/ideas/ideas.test.ts running first
      const response = await authRequest().post("/api/search").send({
        query: "Persistence",
      });

      expect(response.status).toBe(200);

      // If ideas.test.ts ran, this should find "Persistence Test Idea"
      const titles = response.body.data.map((r: any) => r.value.title);
      expect(titles).toContain("Persistence Test Idea");
    });

    it("Finds paraphrased ideas with semantic search and honors the requested threshold", async () => {
      const target = await createSearchIdea(
        "Sourdough starter routine",
        "Maintain the culture with regular flour and water feedings."
      );
      const nearMatch = await createSearchIdea(
        "Adjacent fermentation note",
        "A related but intentionally weaker vector match."
      );
      const unrelated = await createSearchIdea(
        "Quarterly budget",
        "Review revenue forecasts and department expenses."
      );

      const response = await searchEventually(
        {
          query: "How do I care for wild yeast?",
          tables: ["idea"],
          searchType: { fts: false, vector: true },
          vectorSettings: { threshold: 0.9, effort: "high" },
        },
        (results) => results.some((result) => result.id === target.id.toString())
      );

      expect(response.status).toBe(200);

      const ids = response.body.data.map((result: any) => result.id);
      expect(ids).toEqual([target.id.toString()]);
      expect(ids).not.toContain(nearMatch.id.toString());
      expect(ids).not.toContain(unrelated.id.toString());
      expect(response.body.data[0].debug.semanticRank).toBe(1);
    });

    it("Fuses full-text and semantic candidates while ranking overlap first", async () => {
      const overlap = await createSearchIdea(
        "Orchard field notes",
        "A practical record of seasonal pruning."
      );
      const ftsOnly = await createSearchIdea(
        "Orchard bookkeeping",
        "Track invoices and equipment costs."
      );
      const semanticOnly = await createSearchIdea(
        "Fruit tree stewardship",
        "Plan pruning, soil care, and harvest timing."
      );

      const response = await searchEventually(
        {
          query: "orchard",
          tables: ["idea"],
          searchType: { fts: true, vector: true },
          vectorSettings: { threshold: 0.9 },
        },
        (results) =>
          results.some((result) => result.id === overlap.id.toString()) &&
          results.some((result) => result.id === ftsOnly.id.toString()) &&
          results.some((result) => result.id === semanticOnly.id.toString())
      );

      expect(response.status).toBe(200);

      const results = response.body.data;
      const ids = results.map((result: any) => result.id);
      expect(ids).toContain(ftsOnly.id.toString());
      expect(ids).toContain(semanticOnly.id.toString());
      expect(results[0].id).toBe(overlap.id.toString());
      expect(results[0].debug.ftsRank).toBeDefined();
      expect(results[0].debug.semanticRank).toBeDefined();
    });

    it("Rejects invalid search query (missing query field)", async () => {
      const response = await authRequest().post("/api/search").send({
        // missing query
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Spyglass API boundaries", () => {
    it("Rejects malformed stream requests before starting analysis", async () => {
      const response = await authRequest().post("/api/search/spyglass/stream").send({
        query: "What do my notes say?",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid request body");
    });

    it("Rejects explicit scope records the user cannot access", async () => {
      const response = await authRequest()
        .post("/api/search/spyglass/stream")
        .send({
          query: "Summarize this private idea",
          deepAnalysis: true,
          scope: ["idea:notownedbytestuser"],
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Unauthorized scope");
    });

    it("Rejects malformed saved analyses", async () => {
      const response = await authRequest().post("/api/search/spyglass/save").send({
        baseQuery: "",
        scope: [],
        searchPerformed: true,
        isDeepAnalysis: true,
        overview: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid request body");
    });
  });
});
