import React, { useContext, useState, useCallback, useMemo } from "react";
import { INode } from "../declarations/graph";

type FilterConfig = {
  filter: (nodeId: string, node?: INode) => boolean;
};

type IGraphContext = {
  focused: {
    get: string;
    set: (focused: string) => void;
  };
  selected: {
    get: Set<string>;
    set: (ids: string[]) => void;
    add: (id: string) => void;
    remove: (id: string) => void;
    clear: () => void;
    empty: () => boolean;
  };
  highlighted: {
    get: Set<string>;
    set: (ids: string[]) => void;
    add: (id: string) => void;
    remove: (id: string) => void;
    clear: () => void;
    empty: () => boolean;
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
  focused: {
    get: "",
    set: (focused: string) => {},
  },
  selected: {
    get: new Set<string>(),
    set: (ids: string[] | null) => {},
    add: (id: string) => {},
    remove: (id: string) => {},
    clear: () => {},
    empty: () => false,
  },
  highlighted: {
    get: new Set<string>(),
    set: (ids: string[]) => {},
    add: (id: string) => {},
    remove: (id: string) => {},
    clear: () => {},
    empty: () => false,
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
  // Use useState instead of useSet to ensure reference changes propagate correctly
  // through the context and trigger consumer re-renders reliably.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    filter: () => true,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const [focused, setFocused] = useState<string>("");

  const setFocusedHandler = useCallback((f: string) => setFocused(f), []);

  const setSelectedHandler = useCallback((ids: string[] | null) => {
    setSelected(new Set(ids || []));
  }, []);

  const addSelectedHandler = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removeSelectedHandler = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearSelectedHandler = useCallback(() => setSelected(new Set()), []);

  const setHighlightedHandler = useCallback((ids: string[]) => {
    setHighlighted(new Set(ids));
  }, []);

  const addHighlightedHandler = useCallback((id: string) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removeHighlightedHandler = useCallback((id: string) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearHighlightedHandler = useCallback(
    () => setHighlighted(new Set()),
    [],
  );

  const setFilterConfigHandler = useCallback(
    (config: FilterConfig) => setFilterConfig(config),
    [],
  );

  const clearFilterConfigHandler = useCallback(
    () => setFilterConfig({ filter: () => true }),
    [],
  );

  const setLoadingHandler = useCallback((l: boolean) => setLoading(l), []);
  const setQueryHandler = useCallback((q: string) => setQuery(q), []);

  const value: IGraphContext = useMemo(
    () => ({
      focused: {
        get: focused,
        set: setFocusedHandler,
      },
      selected: {
        get: selected,
        set: setSelectedHandler,
        add: addSelectedHandler,
        remove: removeSelectedHandler,
        clear: clearSelectedHandler,
        empty: () => selected.size === 0,
      },
      highlighted: {
        get: highlighted,
        set: setHighlightedHandler,
        add: addHighlightedHandler,
        remove: removeHighlightedHandler,
        clear: clearHighlightedHandler,
        empty: () => highlighted.size === 0,
      },
      filter: {
        set: setFilterConfigHandler,
        get: () => filterConfig,
        clear: clearFilterConfigHandler,
      },
      loading: {
        get: () => loading,
        set: setLoadingHandler,
      },
      query: {
        get: () => query,
        set: setQueryHandler,
      },
    }),
    [
      focused,
      selected,
      highlighted,
      filterConfig,
      loading,
      query,
      setFocusedHandler,
      setSelectedHandler,
      addSelectedHandler,
      removeSelectedHandler,
      clearSelectedHandler,
      setHighlightedHandler,
      addHighlightedHandler,
      removeHighlightedHandler,
      clearHighlightedHandler,
      setFilterConfigHandler,
      clearFilterConfigHandler,
      setLoadingHandler,
      setQueryHandler,
    ],
  );

  return (
    <GraphContext.Provider value={value}>{children}</GraphContext.Provider>
  );
};

export const useGraph = () => useContext(GraphContext);
