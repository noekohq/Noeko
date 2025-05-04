import { ISearchResult } from "../../app/services/Search";

export const getSearchResultPreview = (result: ISearchResult) => {
  if (result.highlightText) {
    return result.highlightText;
  }
  if (result.value.type === "idea") {
    return (
      result.value.derived?.generative_summary?.sentenceSummary ||
      result.value.contentPlain.slice(0, 124)
    );
  }
  if (result.value.type === "file") {
    return result.value.mimeType;
  }
};
