import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/core/hooks/useApiQuery";
import { api } from "@infrastructure/api/client";
import { RecordId } from "surrealdb";
import { applyTagToThing, removeTagFromThing } from "@domains/knowledge/utils/tags";
import { ITag, ITagForm, ITagDescribes } from "../../../../shared/types/tags";

interface IUseTagArgs {
  tagId: string;
}

export const tagKeys = {
  all: ["tags"] as const,
  detail: (id: string) => [...tagKeys.all, id] as const,
  things: (id: string) => [...tagKeys.detail(id), "things"] as const,
  suggestions: (id: string) => [...tagKeys.detail(id), "suggestions"] as const,
};

export default function useTag({ tagId }: IUseTagArgs) {
  const queryClient = useQueryClient();
  const idString = tagId.toString();

  // --- QUERIES ---

  const tagQuery = useApiQuery<ITag>({
    url: `/tags/${idString}`,
    queryKey: tagKeys.detail(idString),
  });

  const thingsQuery = useApiQuery<ITagDescribes[]>({
    url: `/tags/${idString}/things`,
    queryKey: tagKeys.things(idString),
  });

  const suggestionsQuery = useApiQuery<ITagDescribes[]>({
    url: `/tags/${idString}/suggestions`,
    queryKey: tagKeys.suggestions(idString),
  });

  // --- MUTATIONS ---

  const updateTagMutation = useMutation({
    mutationFn: async (data: Partial<ITagForm>) => {
      const res = await api.put<ITag>(`/tags/${idString}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(idString) });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tags/${idString}`);
    },
    onSuccess: () => {
      // Invalidate the broader list of tags if it exists elsewhere
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });

  const applyToMutation = useMutation({
    mutationFn: async (thingId: string | RecordId) => {
      await applyTagToThing(idString, thingId.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.things(idString) });
      queryClient.invalidateQueries({ queryKey: tagKeys.suggestions(idString) });
    },
  });

  const removeFromMutation = useMutation({
    mutationFn: async (thingId: string | RecordId) => {
      await removeTagFromThing(idString, thingId.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.things(idString) });
      queryClient.invalidateQueries({ queryKey: tagKeys.suggestions(idString) });
    },
  });

  return {
    // Data
    tag: tagQuery.data,
    things: thingsQuery.data,
    suggestions: suggestionsQuery.data,

    // Loading States
    isLoading: tagQuery.isLoading || thingsQuery.isLoading || suggestionsQuery.isLoading,
    isUpdating: updateTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,

    // Errors
    tagError: tagQuery.error,
    thingsError: thingsQuery.error,

    // Actions (using mutateAsync to allow await in the component if needed)
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
    applyTo: applyToMutation.mutateAsync,
    removeFrom: removeFromMutation.mutateAsync,
  };
}
