import { RecordId } from "surrealdb";
import { IConnectable, ISimilarConnectable } from "../../app/services/Graph";
import useFetch from "./useFetch";
import { connect, disconnect } from "../utils/graph";
import { useEffect } from "react";
import useRabbithole from "./useRabbithole";

type IUseConnectableArgs = {
  connectable: IConnectable | null;
};

type IUseConnectableReturn = {
  connected: IConnectable[];
  loadingConnected: boolean;
  similar: IConnectable[];
  loadingSimilar: boolean;
  connect: (target: string | RecordId) => Promise<boolean>;
  disconnect: (target: string | RecordId) => Promise<boolean>;
  load: () => void;
  isConnected: (thingId: string | RecordId) => boolean;
  ensureConnected: (thingId: string | RecordId) => Promise<void>;
};

export default function useConnectable({
  connectable,
}: IUseConnectableArgs): IUseConnectableReturn {
  const { currentRabbithole, isDownRabbithole } = useRabbithole();

  const {
    load: loadConnected,
    data: connected = [],
    loading: loadingConnected,
  } = useFetch<undefined, IConnectable[]>({
    url: `/graph/${connectable?.id.toString()}/connections`,
    dependencies: [connectable?.id.toString()],
  });

  const {
    load: loadSimilar,
    data: similar = [],
    loading: loadingSimilar,
  } = useFetch<undefined, ISimilarConnectable[]>({
    url: `/graph/${connectable?.id.toString()}/similar`,
    dependencies: [
      connectable?.id.toString(),
      currentRabbithole?.id.toString(),
    ],
    query: {
      rabbitholeId: isDownRabbithole
        ? currentRabbithole?.id.toString() || ""
        : "",
    },
  });

  const load = () => {
    if (!connectable?.id) {
      console.error("Attempted to load empty connectable information.");
      return;
    }
    loadConnected();
    loadSimilar();
  };

  useEffect(() => {
    if (!connectable?.id) {
      console.error(
        "Can't load connected nodes for connectable because it does not exist.",
      );
      return;
    }
    loadConnected();
  }, [connectable?.updatedAt]);

  useEffect(() => {
    if (!connectable?.id) {
      console.error(
        "Can't load similar nodes for connectable because it does not exist.",
      );
      return;
    }
    loadSimilar();
  }, [connectable?.embeddingsUpdatedAt]);

  useEffect(() => {
    if (!connectable?.id) {
      console.error(
        "Can't load similar nodes for connectable because it does not exist.",
      );
      return;
    }
    loadSimilar();
  }, [currentRabbithole]);

  const handleConnect = async (target: string | RecordId) => {
    try {
      if (!connectable) {
        throw new Error("Can't connect to connectable which does not exist.");
      }
      await connect(connectable.id.toString(), target);
      return true;
    } catch (error) {
      console.error("Error connecting: ", connectable, target, error);
      return false;
    } finally {
      load();
    }
  };

  const handleDisconnect = async (target: string | RecordId) => {
    try {
      if (!connectable) {
        throw new Error(
          "Can't disconnect from connectable that doesn't exist.",
        );
      }
      await disconnect(connectable.id.toString(), target);
      return true;
    } catch (error) {
      console.error("Error disconnecting: ", connectable, target, error);
      return false;
    } finally {
      load();
    }
  };

  const isConnected = (thingId: string | RecordId) => {
    const found = connected.find((c) => c.id.toString() === thingId.toString());
    return !!found;
  };

  const ensureConnected = async (thingId: string | RecordId) => {
    if (!connectable) {
      return;
    }
    if (!isConnected(thingId)) {
      await handleConnect(thingId);
    }
  };

  return {
    connected,
    loadingConnected,
    similar,
    loadingSimilar,
    load,
    connect: handleConnect,
    disconnect: handleDisconnect,
    isConnected,
    ensureConnected,
  };
}
