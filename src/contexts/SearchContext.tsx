import { createContext, useContext, useEffect, useState } from "react";
import { ISearchResult } from "../../app/services/Search";
import { IScope } from "../components/Search/ScopeBuilder/ScopeBuilder";

export type IComponentFilter = {
  query?: string;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
};

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
    loading: {
      get: boolean;
      set: (loading: boolean) => void;
    };
    scope: {
      get: IScope;
      set: (scope: IScope) => void;
    };
    glimpseMode: {
      get: boolean;
      set: (mode: boolean) => void;
    };
    showScope: {
      get: boolean;
      set: (show: boolean) => void;
    };
  };
  component: {
    getFilter: (key: string) => IComponentFilter | undefined;
    setFilter: (key: string, value: IComponentFilter) => void;
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
    loading: {
      get: false,
      set: (loading: boolean) => {},
    },
    scope: {
      get: {},
      set: (scope: IScope) => {},
    },
    glimpseMode: {
      get: false,
      set: (mode: boolean) => {},
    },
    showScope: {
      get: false,
      set: (show: boolean) => {},
    },
  },
  component: {
    getFilter: (key: string) => undefined,
    setFilter: (key: string, value: IComponentFilter) => {},
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
  const [scope, setScope] = useState<IScope>({});
  const [glimpseMode, setGlimpseMode] = useState(false);
  const [showScope, setShowScope] = useState(false);

  const [componentFilters, setComponentFilters] = useState<{
    [key: string]: IComponentFilter;
  }>({});

  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem("componentFilters");
      if (savedFilters) {
        setComponentFilters(JSON.parse(savedFilters));
      }
    } catch (error) {
      console.error(
        "Failed to parse componentFilters from localStorage",
        error,
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("componentFilters", JSON.stringify(componentFilters));
  }, [componentFilters]);

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
      loading: {
        get: loading,
        set: (loading: boolean) => {
          setLoading(loading);
          if (loading) {
            setSearchResults(null);
          }
        },
      },
      scope: {
        get: scope,
        set: setScope,
      },
      glimpseMode: {
        get: glimpseMode,
        set: setGlimpseMode,
      },
      showScope: {
        get: showScope,
        set: setShowScope,
      },
    },
    component: {
      getFilter: (key: string) => componentFilters[key],
      setFilter: (key: string, value: IComponentFilter) => {
        setComponentFilters((prev) => ({ ...prev, [key]: value }));
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
