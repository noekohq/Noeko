import { ISearchResult } from "../../app/services/Search";
import { matchSegments, splitBySentences } from "./processing";

export const getSearchResultPreview = (result: ISearchResult, length = 2) => {
  if (result.highlightText) {
    return matchSegments({
      text: result.highlightText,
      opener: "->",
      closer: "<-",
      splitBy: splitBySentences,
    })
      .slice(0, length)
      .join(" ... ");
  }
  if (result.value.type === "idea") {
    return (
      result.value.derived?.generative_summary?.sentenceSummary ||
      result.value.derived?.generative_summary?.sentenceOverview ||
      result.value.contentPlain.slice(0, 124)
    );
  }
  if (result.value.type === "file") {
    return result.value.mimeType;
  }
};
