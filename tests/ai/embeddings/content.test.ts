import { describe, expect, it } from "vitest";
import {
  getExcerptEmbeddableContent,
  getSourceEmbeddableContent,
  getTagEmbeddableContent,
  getTaskEmbeddableContent,
} from "../../../app/ai/embeddings/content";

describe("embedding content builders", () => {
  it("builds stable canonical content for every managed non-idea record", () => {
    expect(getTagEmbeddableContent({ name: "Research", description: "Things to read" })).toBe(
      "Research:Things to read"
    );
    expect(
      getTaskEmbeddableContent({
        description: "Read the paper",
        scratchpad: "<p>Take notes</p>",
      })
    ).toBe("Read the paper\n---\nTake notes");
    expect(
      getSourceEmbeddableContent({
        analysis: {
          headline: "A useful source",
          abstract: "A short summary",
        },
      })
    ).toBe("A useful source\n---\nA short summary");
    expect(
      getExcerptEmbeddableContent({
        sourceText: "Quoted material",
        note: "Why it matters",
      })
    ).toBe("Quoted material\n---\nWhy it matters");
  });

  it("skips sources that do not have an analysis", () => {
    expect(getSourceEmbeddableContent({ analysis: undefined })).toBeNull();
  });
});
