import { IWebSearchResultItem, WebSearchProvider } from "./index.d";

// --- ENVIRONMENT VARIABLE CHECKS ---
const { GOOGLE_SEARCH_API_KEY, GOOGLE_CX } = process.env;

if (!GOOGLE_SEARCH_API_KEY) {
  throw new Error(
    "No Google Search_API_KEY available, please provide in the .env",
  );
}

if (!GOOGLE_CX) {
  throw new Error("No GOOGLE_CX available, please provide in the .env");
}

// --- TYPE DEFINITIONS for the Google API Response ---
// These help us work with the raw API data safely.
type GoogleApiItem = {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    cse_thumbnail?: { src: string }[];
    metatags?: Record<string, any>[];
  };
};

type GoogleApiResponse = {
  items?: GoogleApiItem[];
};

/**
 * Implements the WebSearchProvider for Google's Custom Search JSON API.
 */
export default class GoogleSearchProvider implements WebSearchProvider {
  private static readonly BASE_URL =
    "https://www.googleapis.com/customsearch/v1";
  private apiKey: string = GOOGLE_SEARCH_API_KEY ?? "";
  private searchEngineId: string = GOOGLE_CX ?? "";

  /**
   * Searches for a query using the Google Custom Search API.
   * @param query The search term.
   * @returns A promise that resolves to an array of standardized search results.
   */
  public async search(
    query: string,
  ): Promise<IWebSearchResultItem[] | undefined> {
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query,
    });

    const url = `${GoogleSearchProvider.BASE_URL}?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `Google Search API Error: ${response.status}`,
          errorData.error.message,
        );
        return undefined; // Indicates a search failure
      }

      const data: GoogleApiResponse = await response.json();

      // If there are no items, return an empty array.
      if (!data.items) {
        return [];
      }

      // Map the raw Google API items to our standardized IWebSearchResultItem interface.
      return data.items.map(this.mapItemToStandard);
    } catch (error) {
      console.error("Failed to execute Google search:", error);
      return undefined;
    }
  }

  /**
   * Maps a single raw item from the Google API to our standard IWebSearchResultItem.
   * This is the "adapter" logic.
   * @param item A raw item from the Google API response.
   * @returns A standardized IWebSearchResultItem object.
   */
  private mapItemToStandard(item: GoogleApiItem): IWebSearchResultItem {
    // Safely access potential date strings from common metadata fields.
    const dateString = item.pagemap?.metatags?.[0]?.["article:published_time"];

    // Safely access the thumbnail URL.
    const thumbnailUrl = item.pagemap?.cse_thumbnail?.[0]?.src;

    // A reliable way to get a favicon URL for any domain.
    const faviconUrl = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${new URL(item.link).origin}`;

    return {
      // The link is a reliable unique identifier for a search result.
      id: item.link,
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      details: {
        thumbnailUrl: thumbnailUrl,
        faviconUrl: faviconUrl,
        // If a date string exists, convert it to a Date object.
        publishedDate: dateString ? new Date(dateString) : undefined,
        // Breadcrumbs are not reliably provided by this API, so we leave it undefined.
        breadcrumbs: undefined,
      },
    };
  }
}
