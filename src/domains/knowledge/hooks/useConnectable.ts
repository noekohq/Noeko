import { RecordId } from "surrealdb";
import { IConnectable, ISimilarConnectable } from "../../../../app/services/Graph";
import {
  connect as connectThing,
  disconnect as disconnectThing,
} from "@infrastructure/graph/utils";
import { useCallback } from "react";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import { ITag, ITagDescriptionRelationship } from "../../../../shared/types/tags";
import { applyTagToThing, removeTagFromThing } from "@domains/knowledge/utils/tags";
import { useApiQuery } from "@core/hooks/useApiQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const { currentRabbithole, isDownRabbithole } = useRabbithole();

  const isOptimistic = (connectable as any)?.isOptimistic;
  const idStr = connectable?.id?.toString();

  // --- QUERIES ---

  const { data: connected = [], isLoading: loadingConnected } = useApiQuery<IConnectable[]>({
    url: !isOptimistic && idStr ? `/graph/${idStr}/connections` : null,
    queryKey: ["graph", idStr, "connections"],
  });

  const { data: similar = [], isLoading: loadingSimilar } = useApiQuery<ISimilarConnectable[]>({
    url: !isOptimistic && idStr ? `/graph/${idStr}/similar` : null,
    query: { rabbitholeId: isDownRabbithole ? currentRabbithole?.id?.toString() || "" : "" },
    queryKey: [
      "graph",
      idStr,
      "similar",
      currentRabbithole?.id?.toString(),
      connectable?.embeddingsUpdatedAt,
    ],
  });

  const { data: tags = [], isLoading: loadingTags } = useApiQuery<ITag[]>({
    url: !isOptimistic && idStr ? `/graph/${idStr}/tags` : null,
    queryKey: ["graph", idStr, "tags"],
  });

  const { data: suggestedTags = [] } = useApiQuery<ITag[]>({
    url: !isOptimistic && idStr ? `/graph/${idStr}/tags/suggested` : null,
    queryKey: ["graph", idStr, "tags", "suggested", connectable?.embeddingsUpdatedAt],
  });

  // --- MUTATIONS ---

  const connectMutation = useMutation({
    mutationFn: async (target: string | RecordId) => {
      if (!idStr) throw new Error("Cannot connect: ID is missing");
      return connectThing(idStr, target);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["graph", idStr, "connections"] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (target: string | RecordId) => {
      if (!idStr) throw new Error("Cannot disconnect: ID is missing");
      return disconnectThing(idStr, target);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["graph", idStr, "connections"] }),
  });

  const applyTagMutation = useMutation({
    mutationFn: async (tagId: string | RecordId) => {
      if (!idStr) throw new Error("Cannot tag: ID is missing");
      return applyTagToThing(tagId, idStr);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["graph", idStr, "tags"] }),
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string | RecordId) => {
      if (!idStr) throw new Error("Cannot remove tag: ID is missing");
      return removeTagFromThing(tagId, idStr);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["graph", idStr, "tags"] }),
  });

  // --- INTERFACE METHODS ---

  const load = useCallback(() => {
    if (!idStr || isOptimistic) return;
    queryClient.invalidateQueries({ queryKey: ["graph", idStr] });
  }, [idStr, isOptimistic, queryClient]);

  const isConnected = useCallback(
    (thingId: string | RecordId) => {
      if (isOptimistic || !connected) return undefined;
      return !!connected.find((c) => c.id.toString() === thingId.toString());
    },
    [connected, isOptimistic]
  );

  const ensureConnected = async (thingId: string | RecordId) => {
    if (!idStr || isOptimistic || loadingConnected) return;
    if (isConnected(thingId) === false) {
      await connectMutation.mutateAsync(thingId);
    }
  };

  const getTagAppliedSet = useCallback(() => {
    return new Set(tags.map((tag) => tag.id.toString()));
  }, [tags]);

  return {
    connected,
    loadingConnected,
    similar,
    loadingSimilar,
    connect: async (target: string | RecordId) =>
      connectMutation
        .mutateAsync(target)
        .then(() => true)
        .catch(() => false),
    disconnect: async (target: string | RecordId) =>
      disconnectMutation
        .mutateAsync(target)
        .then(() => true)
        .catch(() => false),
    loadingConnect: connectMutation.isPending,
    load,
    isConnected,
    ensureConnected,
    tags: {
      applied: tags,
      suggested: suggestedTags,
      appliedSet: getTagAppliedSet(),
      apply: async (tagId: string | RecordId) => applyTagMutation.mutateAsync(tagId),
      remove: async (tagId: string | RecordId) => removeTagMutation.mutateAsync(tagId),
      refresh: async () => {
        queryClient.invalidateQueries({ queryKey: ["graph", idStr, "tags"] });
      },
    },
  };
}
