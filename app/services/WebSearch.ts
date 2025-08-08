import {
  IWebSearchResultItem,
  WebSearchProvider,
} from "./providers/web_search";
import GoogleSearchProvider from "./providers/web_search/google";

const provider = new GoogleSearchProvider();

export default class WebSearch {
  private provider: WebSearchProvider = provider;

  constructor() {}

  public async search(
    query: string,
  ): Promise<IWebSearchResultItem[] | undefined> {
    try {
      const results = await this.provider.search(query);
      if (!results) {
        throw new Error("Provider returned no results!");
      }
      return results;
    } catch (error) {
      console.error("Error searching the web: ", error);
      return undefined;
    }
  }
}
