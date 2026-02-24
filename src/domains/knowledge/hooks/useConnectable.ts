import { RecordId } from "surrealdb";
import { IConnectable, ISimilarConnectable } from "../../../../app/services/Graph";
import useFetch from "@core/hooks/useFetch";
import { connect, disconnect } from "@infrastructure/graph/utils";
import { useCallback, useEffect, useState } from "react";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import { ITag, ITagDescriptionRelationship } from "../../../../shared/types/tags";
import { applyTagToThing, removeTagFromThing } from "@domains/knowledge/utils/tags";

export type IUseConnectableArgs = {
  connectable: IConnectable | null;
};

export type IUseConnectableReturn = {
  connected: IConnectable[];
  loadingConnected: boolean;
  similar: IConnectable[];
  tags: {
    applied: ITag[];
    suggested: ITag[];
    appliedSet: Set<string>;
    apply: (tagId: string | RecordId) => Promise<ITagDescriptionRelationship | undefined>;
    remove: (tagId: string | RecordId) => Promise<ITagDescriptionRelationship | undefined>;
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
  const isOptimistic = (connectable as any)?.isOptimistic;

  const {
    load: loadConnected,
    data: connected = [],
    loading: loadingConnected,
  } = useFetch<undefined, IConnectable[]>({
    url: !isOptimistic ? `/graph/${connectable?.id.toString()}/connections` : null,
    dependencies: [connectable?.id.toString()],
  });

  // FIX: Added embeddingsUpdatedAt to dependencies to force refresh when AI finishes
  const {
    load: loadSimilar,
    data: similar = [],
    loading: loadingSimilar,
  } = useFetch<undefined, ISimilarConnectable[]>({
    url: !isOptimistic ? `/graph/${connectable?.id.toString()}/similar` : null,
    dependencies: [
      connectable?.id.toString(),
      currentRabbithole?.id.toString(),
      connectable?.embeddingsUpdatedAt, // <--- CRITICAL
    ],
    query: {
      rabbitholeId: isDownRabbithole ? currentRabbithole?.id.toString() || "" : "",
    },
  });

  const {
    load: loadTags,
    data: tags = [],
    loading: loadingTags,
  } = useFetch<undefined, ITag[]>({
    url: !isOptimistic ? `/graph/${connectable?.id.toString()}/tags` : null,
    dependencies: [connectable?.id.toString()],
  });

  const {
    load: loadSuggestedTags,
    data: suggestedTags = [],
    loading: loadingSuggestedTags,
  } = useFetch<undefined, ITag[]>({
    url: !isOptimistic ? `/graph/${connectable?.id.toString()}/tags/suggested` : null,
    dependencies: [connectable?.id.toString(), connectable?.embeddingsUpdatedAt],
  });

  const load = useCallback(() => {
    if (isOptimistic || !connectable?.id) {
      console.error("Cancelling load due to non-existent connectable: ", connectable?.id);
      return;
    }
    loadConnected();
    loadSimilar();
    loadTags();
    loadSuggestedTags();
  }, [isOptimistic, connectable?.id, loadConnected, loadSimilar, loadTags, loadSuggestedTags]);

  useEffect(() => {
    if (isOptimistic || !connectable?.id) return;
    loadConnected();
  }, [connectable?.updatedAt]);

  // FIX: This effect now properly triggers because loadSimilar's dependencies
  // (via useFetch) include embeddingsUpdatedAt, so the function identity changes,
  // or the useEffect below catches it.
  useEffect(() => {
    if (isOptimistic || !connectable?.id) return;
    loadSimilar();
    loadSuggestedTags();
  }, [connectable?.embeddingsUpdatedAt, connected, currentRabbithole]);

  const handleConnect = async (target: string | RecordId) => {
    if (isOptimistic || isConnecting) {
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
    if (isOptimistic) return false;
    try {
      if (!connectable) {
        throw new Error("Can't disconnect from connectable that doesn't exist.");
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
    if (isOptimistic || !connected) {
      return undefined;
    }
    const found = connected.find((c) => c.id.toString() === thingId.toString());
    return !!found;
  };

  const ensureConnected = async (thingId: string | RecordId) => {
    if (isOptimistic || !connectable || !thingId) {
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
    if (isOptimistic) return;
    await loadTags();
    await loadSuggestedTags();
  };

  const applyTag = useCallback(
    async (tagId: string | RecordId) => {
      if (isOptimistic || !connectable?.id.toString()) {
        return;
      }
      const res = await applyTagToThing(tagId, connectable?.id.toString());
      refreshTags();
      return res;
    },
    [connectable]
  );

  const removeTag = useCallback(
    async (tagId: string | RecordId) => {
      if (isOptimistic || !connectable?.id.toString()) {
        return;
      }
      const res = await removeTagFromThing(tagId, connectable?.id.toString());
      refreshTags();
      return res;
    },
    [connectable]
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
