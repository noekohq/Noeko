import { createContext, useContext, useEffect, useState } from "react";
import { ISearchResult } from "../../shared/types/search";
import { IGraphFilters } from "../../shared/types/constellation";
import { ITag } from "../../shared/types/tags";

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
      get: IGraphFilters;
      set: (scope: IGraphFilters) => void;
      has: boolean;
    };
    scopeData: {
      tags: {
        get: ITag[];
        set: (tags: ITag[]) => void;
        add: (tag: ITag) => void;
        remove: (tagId: string) => void;
      };
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
      set: (scope: IGraphFilters) => {},
      has: false,
    },
    scopeData: {
      tags: {
        get: [],
        set: (tags: ITag[]) => {},
        add: (tag: ITag) => {},
        remove: (tagId: string) => {},
      },
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
  const [scope, setScope] = useState<IGraphFilters>({});
  const [scopeTags, setScopeTags] = useState<ITag[]>([]);
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

  const hasScope = () => {
    if (scope.rabbithole) return true;
    if (scope.scope && scope.scope.length > 0) return true;
    if (scope.tags?.set && scope.tags.set.length > 0) return true;
    if (scope.showShared) return true;
    if (scope.showFriends) return true;

    if (scope.date) {
      if (
        scope.date.createdAt?.after ||
        scope.date.createdAt?.before ||
        scope.date.updatedAt?.after ||
        scope.date.updatedAt?.before ||
        scope.date.viewedAt?.after ||
        scope.date.viewedAt?.before
      ) {
        return true;
      }
    }

    return false;
  };

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
        has: hasScope(),
      },
      scopeData: {
        tags: {
          get: scopeTags,
          set: setScopeTags,
          add: (tag: ITag) => {
            setScopeTags((prev) => {
              if (prev.some((t) => t.id.toString() === tag.id.toString()))
                return prev;
              return [...prev, tag];
            });
            setScope((prevScope) => {
              const currentSet = prevScope.tags?.set || [];
              if (
                currentSet.some((id) => id.toString() === tag.id.toString())
              ) {
                return prevScope;
              }
              return {
                ...prevScope,
                tags: {
                  set: [...currentSet, tag.id.toString()],
                  behavior: prevScope.tags?.behavior || "or",
                },
              };
            });
          },
          remove: (tagId: string) => {
            setScope((prevScope) => {
              const currentSet = prevScope.tags?.set || [];
              return {
                ...prevScope,
                tags: {
                  ...prevScope.tags,
                  set: currentSet.filter((id) => id.toString() !== tagId),
                  behavior: prevScope.tags?.behavior || "or",
                },
              };
            });
          },
        },
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
