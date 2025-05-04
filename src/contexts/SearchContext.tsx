import { createContext, useContext, useState } from "react";
import { ISearchResult } from "../../app/services/Search";

type ISearchContext = {
  query: {
    get: string;
    set: (q: string) => void;
  };
  results: {
    get: ISearchResult[] | null;
    set: (results: ISearchResult[] | undefined) => void;
  };
};

const initialSearch: ISearchContext = {
  query: {
    get: "",
    set: (q: string) => {},
  },
  results: {
    get: null,
    set: () => {},
  },
};

const SearchContext = createContext(initialSearch);

type ISearchProviderProps = {
  children: React.ReactNode;
};

export const SearchProvider = ({ children }: ISearchProviderProps) => {
  const [query, setQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ISearchResult[]>(null);

  const value: ISearchContext = {
    query: {
      get: query,
      set: setQuery,
    },
    results: {
      get: searchResults,
      set: setSearchResults,
    },
  };

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};
