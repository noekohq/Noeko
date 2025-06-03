import { createContext, useContext, useState } from "react";
import { ISearchOverview, ISearchResult } from "../../app/services/Search";

type ISearchContext = {
  global: {
    query: {
      get: string;
      set: (q: string) => void;
    };
    results: {
      get: ISearchResult[] | null;
      set: (results: ISearchResult[] | null) => void;
    };
    overview: {
      get: ISearchOverview | null;
      set: (overview: ISearchOverview | null) => void;
    };
    loading: {
      get: boolean;
      set: (loading: boolean) => void;
    };
  };
};

const initialSearch: ISearchContext = {
  global: {
    query: {
      get: "",
      set: (q: string) => {},
    },
    results: {
      get: null,
      set: (results: ISearchResult[] | null) => {},
    },
    overview: {
      get: null,
      set: (overview: ISearchOverview | null) => {},
    },
    loading: {
      get: false,
      set: (loading: boolean) => {},
    },
  },
};

const SearchContext = createContext(initialSearch);

type ISearchProviderProps = {
  children: React.ReactNode;
};

export const SearchProvider = ({ children }: ISearchProviderProps) => {
  const [query, setQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ISearchResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<ISearchOverview | null>(null);

  const value: ISearchContext = {
    global: {
      query: {
        get: query,
        set: setQuery,
      },
      results: {
        get: searchResults,
        set: (r: ISearchResult[] | null) => {
          setSearchResults(r);
        },
      },
      overview: {
        get: overview,
        set: (overview: ISearchOverview | null) => {
          setOverview(overview);
        },
      },
      loading: {
        get: loading,
        set: (loading: boolean) => {
          setLoading(loading);
          if (loading) {
            setSearchResults(null);
          }
        },
      },
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
