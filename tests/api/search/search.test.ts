import request from "supertest";
import { app } from "../../../app/index";
import { describe, it, expect, vi } from "vitest";
import { authRequest } from "../../helpers/context";

vi.mock("../../../app/ai/embeddings/embeddings", () => ({
  getEmbedder: vi.fn(() => ({
    model: "mock-model",
    embedContent: vi.fn(async () => new Array(768).fill(0)),
    embedContents: vi.fn(async (contents: string[]) => contents.map(() => new Array(768).fill(0))),
    getEmptyEmbeddings: vi.fn(async (dimension = 768) => new Array(dimension).fill(0)),
    listAvailableModels: vi.fn(async () => ["mock-model"]),
  })),
}));

describe("Search Router", () => {
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

    it("Rejects invalid search query (missing query field)", async () => {
      const response = await authRequest().post("/api/search").send({
        // missing query
      });

      expect(response.status).toBe(400);
    });
  });
});
