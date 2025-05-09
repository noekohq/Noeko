import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { IIdea } from "../../app/database/models/ideas";
import { createIdeaConnection } from "../utils/ideas";
import { ideasAreConnected } from "../utils/graph";

type IIdeaContext = {
  idea?: IIdea;
  ensureConnected: (target: string) => void;
};

const initialContext: IIdeaContext = {
  idea: undefined,
  ensureConnected: (target: string) => {},
};

const IdeaContext = createContext<IIdeaContext>(initialContext);

type IIdeaProviderProps = {
  children: React.ReactNode;
  idea: IIdea | undefined;
  reloadIdea: () => Promise<void> | void;
};

export const IdeaProvider = ({
  children,
  idea,
  reloadIdea,
}: IIdeaProviderProps) => {
  const [loadingConnection, setLoadingConnection] = useState(false);
  const runningConnection = useRef(false);
  const ranConnection = useRef(false);

  const connectIdeas = useCallback(
    async (target: string) => {
      if (!idea || loadingConnection) {
        return;
      }
      setLoadingConnection(true);
      console.log("SIMULATING IDEA CONNECT");
      runningConnection.current = true;
      ranConnection.current = true;
      console.log("FINISHED IDEA CONNECT");
      await createIdeaConnection(idea.id.toString(), target);
      await reloadIdea();
      setLoadingConnection(false);
    },
    [idea, loadingConnection],
  );

  const ensureConnected = useCallback(
    async (target: string) => {
      if (
        !idea ||
        loadingConnection ||
        runningConnection.current ||
        ranConnection.current
      ) {
        return false;
      }
      const areConnected = ideasAreConnected(idea, target);
      if (areConnected === undefined) {
        console.log("Skipping due to inconclusivity");
        return;
      }
      if (!areConnected) {
        console.log("Going to run connect func!!!!");
        await connectIdeas(target);
      }
    },
    [idea?.id, loadingConnection],
  );

  return (
    <IdeaContext.Provider
      value={{
        idea: idea,
        ensureConnected,
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
