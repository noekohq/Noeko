import { createContext, useContext } from "react";
import { IIdea } from "../../app/database/models/ideas";

type IIdeaContext = {
  idea?: IIdea;
};

const initialContext: IIdeaContext = {
  idea: undefined,
};

const IdeaContext = createContext<IIdeaContext>(initialContext);

type IIdeaProviderProps = {
  children: React.ReactNode;
  idea?: IIdea;
};

export const IdeaProvider = ({ children, idea }: IIdeaProviderProps) => {
  return (
    <IdeaContext.Provider
      value={{
        idea: idea,
      }}
    >
      {children}
    </IdeaContext.Provider>
  );
};

export const useIdea = () => {
  const context = useContext(IdeaContext);
  if (!context) {
    throw new Error("useIdea must be used within a IdeaProvider");
  }
  return context;
};
