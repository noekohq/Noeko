import React, { useContext, useEffect, useState } from "react";
import { IDerivedNode, INode } from "../declarations/graph";
import { useSet } from "@mantine/hooks";

type FilterConfig = {
  filter: (node: INode) => boolean;
};

type IGraphContext = {
  selected: {
    get: Set<string>;
    set: (ids: string[]) => void;
    add: (id: string) => void;
    remove: (id: string) => void;
    clear: () => void;
  };
  highlighted: {
    get: Set<string>;
    set: (ids: string[]) => void;
    add: (id: string) => void;
    remove: (id: string) => void;
    clear: () => void;
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
    get: new Set<string>(),
    set: (ids: string[] | null) => {},
    add: (id: string) => {},
    remove: (id: string) => {},
    clear: () => {},
  },
  highlighted: {
    get: new Set<string>(),
    set: (ids: string[]) => {},
    add: (id: string) => {},
    remove: (id: string) => {},
    clear: () => {},
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
  const selected = useSet<string>();
  const highlighted = useSet<string>();
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    filter: () => true,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const value: IGraphContext = {
    selected: {
      get: selected,
      set: (ids: string[] | null) => {
        selected.clear();
        ids?.forEach((id) => selected.add(id));
      },
      add: (id: string) => {
        selected.add(id);
      },
      remove: (id: string) => {
        selected.delete(id);
      },
      clear: () => {
        selected.clear();
      },
    },
    highlighted: {
      get: highlighted,
      set: (ids: string[]) => {
        highlighted.clear();
        ids.forEach((id) => highlighted.add(id));
      },
      add: (id: string) => {
        highlighted.add(id);
      },
      remove: (id: string) => {
        highlighted.delete(id);
      },
      clear: () => {
        highlighted.clear();
      },
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

  return (
    <GraphContext.Provider value={value}>{children}</GraphContext.Provider>
  );
};

export const useGraph = () => useContext(GraphContext);
