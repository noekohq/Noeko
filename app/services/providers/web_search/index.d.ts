export type IWebSearchResultItem = {
  id: string;
  title: string;
  link: string;
  snippet?: string;
  loaded: {
    content: string;
  };
  details?: {
    thumbnailUrl?: string;
    faviconUrl?: string;
    publishedDate?: Date;
    breadcrumbs?: string[];
  };
};

export interface WebSearchProvider {
  search(query: string): Promise<IWebSearchResultItem[] | undefined>;
}
