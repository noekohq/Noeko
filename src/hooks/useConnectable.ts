import { RecordId } from "surrealdb";
import { IConnectable } from "../../app/services/Graph";
import useFetch from "./useFetch";
import { connect, disconnect } from "../utils/graph";

type IUseConnectableArgs = {
  connectable: IConnectable;
};

type IUseConnectableReturn = {
  connected: IConnectable[];
  loadingConnected: boolean;
  similar: IConnectable[];
  loadingSimilar: boolean;
  connect: (target: string | RecordId) => Promise<boolean>;
  disconnect: (target: string | RecordId) => Promise<boolean>;
  reload: () => void;
  isConnected: (thingId: string | RecordId) => boolean;
};

export default function useConnectable({
  connectable,
}: IUseConnectableArgs): IUseConnectableReturn {
  const {
    load: loadConnected,
    data: connected = [],
    loading: loadingConnected,
  } = useFetch<undefined, IConnectable[]>({
    url: `/graph/${connectable.id.toString()}/connected`,
    dependencies: [connectable.id.toString()],
  });

  const {
    load: loadSimilar,
    data: similar = [],
    loading: loadingSimilar,
  } = useFetch<undefined, (IConnectable & { distance: number })[]>({
    url: `/graph/${connectable.id.toString()}/similar`,
    dependencies: [connectable.id.toString()],
  });

  const reload = () => {
    loadConnected();
    loadSimilar();
  };

  const handleConnect = async (target: string | RecordId) => {
    try {
      await connect(connectable.id.toString(), target);
      return true;
    } catch (error) {
      console.error("Error connecting: ", connectable, target, error);
      return false;
    } finally {
      loadConnected();
    }
  };

  const handleDisconnect = async (target: string | RecordId) => {
    try {
      await disconnect(connectable.id.toString(), target);
      return true;
    } catch (error) {
      console.error("Error disconnecting: ", connectable, target, error);
      return false;
    } finally {
      loadConnected();
    }
  };

  const isConnected = (thingId: string | RecordId) => {
    const found = connected.find((c) => c.id.toString() === thingId.toString());
    return !!found;
  };

  return {
    connected,
    loadingConnected,
    similar,
    loadingSimilar,
    reload,
    connect: handleConnect,
    disconnect: handleDisconnect,
    isConnected,
  };
}
