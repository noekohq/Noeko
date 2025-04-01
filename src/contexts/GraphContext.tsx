import React, { useContext, useState } from "react";
import { INode } from "../declarations/graph";

type FilterConfig = {
  filter: (node: INode) => boolean;
};

type GraphContextType = {
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
};

const initialGraphContext: GraphContextType = {
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
};

const GraphContext = React.createContext(initialGraphContext);

export const GraphProvider = ({ children }: { children: React.ReactNode }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    filter: () => true,
  });

  const value = {
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
  };

  return (
    <GraphContext.Provider value={value}>{children}</GraphContext.Provider>
  );
};

export const useGraph = () => useContext(GraphContext);
