import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { IRabbithole } from "../../app/database/models/rabbithole";
import { IIdea, ISafeIdea } from "../../app/database/models/ideas";
import useFetch from "../hooks/useFetch";

interface ILandscapeContext {
  rabbitholes: {
    entered: {
      get: IRabbithole | null;
      set: (rabbithole: IRabbithole | null) => void;
      reload: () => void;
    };
  };
  idea: {
    viewing: {
      get: ISafeIdea | null;
      set: (idea: ISafeIdea | null) => void;
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
  idea: {
    viewing: {
      get: null,
      set: () => {},
    },
  },
};

const LandscapeContext = createContext(initialContext);

export const LandscapeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [rabbithole, setRabbithole] = useState<IRabbithole | null>(null);
  const [idea, setIdea] = useState<ISafeIdea | null>(null);

  const { load: reloadRabbithole } = useFetch<undefined, IRabbithole>({
    url: `/rabbitholes/${rabbithole?.id.toString()}`,
    dependencies: [rabbithole?.id.toString()],
    onSuccess: (d) => {
      console.log("Setting rabbithole: ", d);
      setRabbithole(d);
    },
  });
  const handleReloadRabbithole = () => {
    if (
      !!rabbithole &&
      rabbithole?.includes === undefined &&
      rabbithole.id !== undefined
    ) {
      reloadRabbithole();
    }
  };

  useEffect(() => {
    handleReloadRabbithole();
  }, [rabbithole]);

  const value = {
    rabbitholes: {
      entered: {
        get: rabbithole,
        set: setRabbithole,
        reload: () => handleReloadRabbithole(),
      },
    },
    idea: {
      viewing: {
        get: idea,
        set: setIdea,
      },
    },
  };

  return (
    <LandscapeContext.Provider value={value}>
      {children}
    </LandscapeContext.Provider>
  );
};

export const useLandscape = () => {
  const context = useContext(LandscapeContext);
  if (!context) {
    throw new Error("useLandscape must be used within a LandscapeProvider");
  }
  return context;
};
