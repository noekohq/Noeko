import { RecordId } from "surrealdb";
import { IConnectable, ISimilarConnectable } from "../../app/services/Graph";
import useFetch from "./useFetch";
import { connect, disconnect } from "../utils/graph";
import { useCallback, useEffect, useState } from "react";
import useRabbithole from "./useRabbithole";
import {
  ITag,
  ITagDescriptionRelationship,
} from "../../app/database/models/tag";
import { applyTagToThing, removeTagFromThing } from "../utils/tags";

type IUseConnectableArgs = {
  connectable: IConnectable | null;
};

type IUseConnectableReturn = {
  connected: IConnectable[];
  loadingConnected: boolean;
  similar: IConnectable[];
  tags: {
    applied: ITag[];
    suggested: ITag[];
    appliedSet: Set<string>;
    apply: (
      tagId: string | RecordId,
    ) => Promise<ITagDescriptionRelationship | undefined>;
    remove: (
      tagId: string | RecordId,
    ) => Promise<ITagDescriptionRelationship | undefined>;
    refresh: () => Promise<void>;
  };
  loadingSimilar: boolean;
  connect: (target: string | RecordId) => Promise<boolean>;
  disconnect: (target: string | RecordId) => Promise<boolean>;
  loadingConnect: boolean;
  load: () => void;
  isConnected: (thingId: string | RecordId) => boolean | undefined;
  ensureConnected: (thingId: string | RecordId) => Promise<void>;
};

export default function useConnectable({
  connectable,
}: IUseConnectableArgs): IUseConnectableReturn {
  const [isConnecting, setIsConnecting] = useState(false);
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

  const {
    load: loadTags,
    data: tags = [],
    loading: loadingTags,
  } = useFetch<undefined, ITag[]>({
    url: `/graph/${connectable?.id.toString()}/tags`,
    dependencies: [connectable?.id.toString()],
  });

  const {
    load: loadSuggestedTags,
    data: suggestedTags = [],
    loading: loadingSuggestedTags,
  } = useFetch<undefined, ITag[]>({
    url: `/graph/${connectable?.id.toString()}/tags/suggested`,
    dependencies: [connectable?.id.toString()],
  });

  const load = () => {
    if (!connectable?.id) {
      console.error("Attempted to load empty connectable information.");
      return;
    }
    loadConnected();
    loadSimilar();
    loadTags();
    loadSuggestedTags();
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
  }, [connectable?.embeddingsUpdatedAt, connected]);

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
    if (isConnecting) {
      return false;
    }
    setIsConnecting(true);
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
      setIsConnecting(false);
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
    if (!connected) {
      return undefined;
    }
    const found = connected.find((c) => c.id.toString() === thingId.toString());
    return !!found;
  };

  const ensureConnected = async (thingId: string | RecordId) => {
    if (!connectable || !thingId) {
      return;
    }
    if (loadingConnected) {
      return;
    }
    const connected = isConnected(thingId);
    if (connected === undefined) {
      return;
    }
    if (!connected) {
      await handleConnect(thingId);
    }
  };

  const refreshTags = async () => {
    await loadTags();
    await loadSuggestedTags();
  };

  const applyTag = useCallback(
    async (tagId: string | RecordId) => {
      if (!connectable?.id.toString()) {
        return;
      }
      const res = await applyTagToThing(tagId, connectable?.id.toString());
      refreshTags();
      return res;
    },
    [connectable],
  );

  const removeTag = useCallback(
    async (tagId: string | RecordId) => {
      if (!connectable?.id.toString()) {
        return;
      }
      const res = await removeTagFromThing(tagId, connectable?.id.toString());
      refreshTags();
      return res;
    },
    [connectable],
  );

  const getTagAppliedSet = useCallback(() => {
    return new Set(tags.map((tag) => tag.id.toString()));
  }, [tags]);

  return {
    connected,
    loadingConnected,
    similar,
    loadingSimilar,
    load,
    connect: handleConnect,
    disconnect: handleDisconnect,
    loadingConnect: isConnecting,
    isConnected,
    ensureConnected,
    tags: {
      applied: tags,
      appliedSet: getTagAppliedSet(),
      suggested: suggestedTags,
      apply: applyTag,
      remove: removeTag,
      refresh: refreshTags,
    },
  };
}
