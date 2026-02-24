import { createContext, useContext, useEffect, useState } from "react";
import { IRabbithole } from "../../app/database/models/rabbithole";
import useFetch from "@core/hooks/useFetch";
import { IConnectable } from "../../app/services/Graph";
import { IIdea } from "../../shared/types/idea";

export type IOptimisticIdea = IIdea & { isOptimistic: true };

interface ISelection {
  content: string;
}

interface ILandscapeContext {
  rabbitholes: {
    entered: {
      get: IRabbithole | null;
      set: (rabbithole: IRabbithole | null) => void;
      reload: () => void;
    };
  };
  connectable: {
    viewing: {
      get: IConnectable | null;
      set: (connectable: IConnectable | null) => void;
    };
  };
  selection: {
    current: {
      get: ISelection | null;
      set: (selection: ISelection) => void;
    };
  };
  dragging: {
    current: {
      get: string | null;
      set: (dragging: string | null) => void;
    };
  };
  ideas: {
    optimistic: {
      get: (id: string) => IOptimisticIdea | undefined;
      add: (idea: IOptimisticIdea) => void;
      remove: (id: string) => void;
    };
  };
}

const initialContext: ILandscapeContext = {
  rabbitholes: {
    entered: {
      get: null,
      set: () => {},
      reload: () => {},
    },
  },
  connectable: {
    viewing: {
      get: null,
      set: () => {},
    },
  },
  selection: {
    current: {
      get: null,
      set: () => {},
    },
  },
  dragging: {
    current: {
      get: null,
      set: () => {},
    },
  },
  ideas: {
    optimistic: {
      get: () => undefined,
      add: () => {},
      remove: () => {},
    },
  },
};

const LandscapeContext = createContext(initialContext);

export const LandscapeProvider = ({ children }: { children: React.ReactNode }) => {
  const [rabbithole, setRabbithole] = useState<IRabbithole | null>(null);
  const [connectable, setConnectable] = useState<IConnectable | null>(null);
  const [selection, setSelection] = useState<ISelection | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [optimisticIdeas, setOptimisticIdeas] = useState<IOptimisticIdea[]>([]);

  const addOptimisticIdea = (idea: IOptimisticIdea) => {
    setOptimisticIdeas((prev) => [...prev, idea]);
  };

  const removeOptimisticIdea = (tempId: string) => {
    setOptimisticIdeas((prev) => prev.filter((idea) => idea.id !== tempId));
  };

  const getOptimisticIdea = (id: string) => {
    return optimisticIdeas.find((idea) => idea.id === id);
  };

  const { load: reloadRabbithole } = useFetch<undefined, IRabbithole>({
    url: `/rabbitholes/${rabbithole?.id.toString()}`,
    dependencies: [rabbithole?.id.toString()],
    onSuccess: (d) => {
      setRabbithole(d);
    },
  });

  const handleReloadRabbithole = () => {
    if (!!rabbithole && rabbithole.id !== undefined) {
      reloadRabbithole();
    }
  };

  useEffect(() => {
    handleReloadRabbithole();
  }, [rabbithole?.id.toString()]);

  const value = {
    rabbitholes: {
      entered: {
        get: rabbithole,
        set: setRabbithole,
        reload: () => handleReloadRabbithole(),
      },
    },
    connectable: {
      viewing: {
        get: connectable,
        set: setConnectable,
      },
    },
    selection: {
      current: {
        get: selection,
        set: setSelection,
      },
    },
    dragging: {
      current: {
        get: dragging,
        set: setDragging,
      },
    },
    ideas: {
      optimistic: {
        get: getOptimisticIdea,
        add: addOptimisticIdea,
        remove: removeOptimisticIdea,
      },
    },
  } satisfies ILandscapeContext;

  return <LandscapeContext.Provider value={value}>{children}</LandscapeContext.Provider>;
};

export const useLandscape = () => {
  const context = useContext(LandscapeContext);
  if (!context) {
    throw new Error("useLandscape must be used within a LandscapeProvider");
  }
  return context;
};
