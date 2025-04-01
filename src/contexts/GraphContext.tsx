import React, { useContext, useState } from "react";

type GraphContextType = {
  selected: {
    get: () => string | null;
    set: (id: string | null) => void;
  };
  highlighted: {
    get: () => Set<string>;
    set: (ids: string[]) => void;
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
};

const GraphContext = React.createContext(initialGraphContext);

export const GraphProvider = ({ children }: { children: React.ReactNode }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const value = {
    selected: {
      get: () => selected,
      set: (id: string | null) => setSelected(id),
    },
    highlighted: {
      get: () => highlighted,
      set: (ids: string[]) => setHighlighted(new Set(ids)),
    },
  };

  return (
    <GraphContext.Provider value={value}>{children}</GraphContext.Provider>
  );
};

export const useGraph = () => useContext(GraphContext);
