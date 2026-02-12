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

describe("Ideas Router", () => {
  let createdIdeaId: string;

  describe("GET /api/ideas", () => {
    it("Retrieves existing onboarding ideas", async () => {
      const response = await authRequest().get("/api/ideas");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/ideas", () => {
    it("Creates a new idea", async () => {
      const ideaData = {
        title: "Persistence Test Idea",
        content: "<p>This idea should persist across tests</p>",
      };

      const response = await authRequest().post("/api/ideas").send(ideaData);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe(ideaData.title);

      createdIdeaId = response.body.data.id;
    });

    it("Rejects untitled requests without generation request", async () => {
      const ideaData = {
        title: "",
        generateTitle: false,
        content: "",
      };

      const response = await authRequest().post("/api/ideas").send(ideaData);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/ideas/:id", () => {
    it("Retrieves the newly created idea by ID", async () => {
      expect(createdIdeaId).toBeDefined();

      const response = await authRequest().get(`/api/ideas/${createdIdeaId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Persistence Test Idea");
    });
  });
});
