import { getTextFromStaticPage } from "../utils/web/web";
import {
  IWebSearchResultItem,
  WebSearchProvider,
} from "./providers/web_search";
import GoogleSearchProvider from "./providers/web_search/google";

const provider = new GoogleSearchProvider();

export default class WebSearchService {
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

  public async searchMany(
    queries: string[],
  ): Promise<IWebSearchResultItem[] | undefined> {
    try {
      const results = await Promise.all(
        queries.map((query) => this.provider.search(query)),
      );
      const filteredResults = results.filter((result) => !!result);
      const processed = filteredResults.flat();
      return processed;
    } catch (error) {
      console.error("Error searching the web: ", error);
      return undefined;
    }
  }

  public async loadItemContent(
    item: IWebSearchResultItem,
  ): Promise<IWebSearchResultItem | null> {
    try {
      const url = item.link;
      const text = await getTextFromStaticPage(url);
      return {
        ...item,
        loaded: {
          content: text || "",
        },
      };
    } catch (error) {
      console.error(`Error fetching static page ${item.link}:`, error);
      return null;
    }
  }
}
