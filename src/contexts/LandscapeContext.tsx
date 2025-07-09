import { createContext, useContext, useMemo, useState } from "react";
import { IRabbithole } from "../../app/database/models/rabbithole";
import { IIdea } from "../../app/database/models/ideas";

interface ILandscapeContext {
  rabbitholes: {
    entered: {
      get: IRabbithole | null;
      set: (rabbithole: IRabbithole | null) => void;
    };
  };
  idea: {
    viewing: {
      get: IIdea | null;
      set: (idea: IIdea | null) => void;
    };
  };
}

const initialContext: ILandscapeContext = {
  rabbitholes: {
    entered: {
      get: null,
      set: () => {},
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
  const [idea, setIdea] = useState<IIdea | null>(null);

  const value = useMemo<ILandscapeContext>(
    () => ({
      rabbitholes: {
        entered: {
          get: rabbithole,
          set: setRabbithole,
        },
      },
      idea: {
        viewing: {
          get: idea,
          set: setIdea,
        },
      },
    }),
    [rabbithole, idea],
  );

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
