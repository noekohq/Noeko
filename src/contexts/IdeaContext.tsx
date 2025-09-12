import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IIdea, ISafeIdea } from "../../app/database/models/ideas";
import { createIdeaConnection } from "../utils/ideas";
import { isIncluded } from "../utils/graph";
import { ideasAreConnected } from "../utils/ideas";
import useFetch from "../hooks/useFetch";

type IIdeaContext = {
  idea?: ISafeIdea;
  ensureConnected: (target: string) => void;
};

const initialContext: IIdeaContext = {
  idea: undefined,
  ensureConnected: (target: string) => {},
};

const IdeaContext = createContext<IIdeaContext>(initialContext);

type IIdeaProviderProps = {
  children: React.ReactNode;
  idea: ISafeIdea | undefined;
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

  const {
    load: loadConnections,
    data: connections,
    loading: loadingConnections,
  } = useFetch<undefined, ISafeIdea[]>({
    url: `/ideas/${idea?.id.toString()}/connections`,
  });

  useEffect(() => {
    loadConnections();
  }, [idea]);

  const connectIdeas = useCallback(
    async (target: string) => {
      if (!idea || loadingConnection) {
        return;
      }
      setLoadingConnection(true);
      runningConnection.current = true;
      ranConnection.current = true;
      await createIdeaConnection(idea.id.toString(), target);
      await reloadIdea();
      setLoadingConnection(false);
    },
    [idea, loadingConnection, connections],
  );

  const ensureConnected = useCallback(
    async (target: string) => {
      if (
        !idea ||
        !target ||
        loadingConnection ||
        runningConnection.current ||
        ranConnection.current
      ) {
        return false;
      }
      if (!connections) {
        return;
      }
      const areConnected = isIncluded(connections, target);
      if (areConnected === undefined) {
        return;
      }
      if (!areConnected) {
        await connectIdeas(target);
      }
    },
    [idea?.id, loadingConnection, connections],
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
