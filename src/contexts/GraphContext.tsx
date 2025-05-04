import React, { useContext, useEffect, useState } from "react";
import { IDerivedNode, INode } from "../declarations/graph";

type FilterConfig = {
  filter: (node: INode) => boolean;
};

type IGraphContext = {
  selected: {
    get: () => string | null;
    set: (id: string | null) => void;
  };
  highlighted: {
    get: () => Set<string>;
    set: (ids: string[]) => void;
  };
  filter: {
    set: (config: FilterConfig) => void;
    get: () => FilterConfig;
    clear: () => void;
  };
  loading: {
    get: () => boolean;
    set: (loading: boolean) => void;
  };
  query: {
    get: () => string;
    set: (query: string) => void;
  };
};

const initialGraphContext: IGraphContext = {
  selected: {
    get: () => null,
    set: (id: string | null) => {},
  },
  highlighted: {
    get: () => new Set<string>(),
    set: (ids: string[]) => {},
  },
  filter: {
    set: (config: FilterConfig) => {},
    get: () => ({ filter: () => true }),
    clear: () => {},
  },
  loading: {
    get: () => false,
    set: (loading: boolean) => {},
  },
  query: {
    get: () => "",
    set: (query: string) => {},
  },
};

const GraphContext = React.createContext(initialGraphContext);

export const GraphProvider = ({ children }: { children: React.ReactNode }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    filter: () => true,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const value: IGraphContext = {
    selected: {
      get: () => selected,
      set: (id: string | null) => setSelected(id),
    },
    highlighted: {
      get: () => highlighted,
      set: (ids: string[]) => setHighlighted(new Set(ids)),
    },
    filter: {
      set: (config: FilterConfig) => setFilterConfig(config),
      get: () => filterConfig,
      clear: () => setFilterConfig({ filter: () => true }),
    },
    loading: {
      get: () => loading,
      set: (loading: boolean) => setLoading(loading),
    },
    query: {
      get: () => query,
      set: (query: string) => {
        setQuery(query);
      },
    },
  };

  useEffect(() => {
    console.log("Filter config: ", filterConfig);
  }, [filterConfig]);

  return (
    <GraphContext.Provider value={value}>{children}</GraphContext.Provider>
  );
};

export const useGraph = () => useContext(GraphContext);
