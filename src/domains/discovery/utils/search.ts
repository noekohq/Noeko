import { ISearchResult } from "../../../../shared/types/search";
import { getNodeDescription } from "@infrastructure/graph/utils";
import { matchSegments, splitBySentences } from "@core/utils/processing";

export const getSearchResultPreview = (result: ISearchResult, length = 2) => {
  if (result.highlightText) {
    const matching = matchSegments({
      text: result.highlightText,
      opener: "->",
      closer: "<-",
      splitBy: splitBySentences,
    })
      ?.slice(0, length)
      .join(" ... ");
    if (matching?.length > 1) {
      return matching;
    }
  }
  return getNodeDescription(result.value);
};
