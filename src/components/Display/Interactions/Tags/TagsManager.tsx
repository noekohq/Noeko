import { Group, Stack, Text } from "@mantine/core";
import { TagIcon } from "@phosphor-icons/react";
import { IConnectable } from "../../../../../app/services/Graph"; // Adjust
import useConnectable from "../../../../hooks/useConnectable"; // Adjust
import { useEffect, useState } from "react";
import { TagPicker } from "./TagPicker"; // Import the new component
import { createTagAndAddToThing } from "../../../../utils/tags"; // Adjust
import styles from "./TagsManager.module.scss";
// Assuming you will create this or use your PaperTag logic here
import PaperTag, { ITagState } from "../../Paper/Tags/PaperTag";

type ITagsManagerProps = {
  connectable: IConnectable;
  maxSuggested: number;
};

export default function TagsManager({
  connectable,
  maxSuggested,
}: ITagsManagerProps) {
  const {
    tags: {
      appliedSet,
      applied: appliedTags,
      suggested: suggestedTags,
      refresh: refreshTags,
      apply: applyTag,
      remove: removeTag,
    },
  } = useConnectable({ connectable });

  useEffect(() => {
    refreshTags();
  }, [connectable.embeddingsUpdatedAt]);

  const handleCreateAndAdd = async (
    name: string,
    description: string,
    color: string,
  ) => {
    await createTagAndAddToThing(name, description, connectable.id.toString());
    refreshTags();
  };

  const handleApplyExisting = async (tagId: string) => {
    await applyTag(tagId);
    refreshTags();
  };

  const handleRemoveExisting = async (tagId: string) => {
    await removeTag(tagId);
    refreshTags();
  };

  const [showingAll, setShowAll] = useState(false);

  const filteredSuggested = suggestedTags.filter(
    (t) => !appliedSet.has(t.id.toString()),
  );
  const suggestedToAllowed = showingAll
    ? filteredSuggested
    : filteredSuggested.slice(0, maxSuggested);
  const slicedOutSuggestions = showingAll
    ? []
    : filteredSuggested.slice(maxSuggested);

  return (
    <div className={styles.tagsManager}>
      {/* Optional: Minimal header, or remove entirely for pure "flow" */}
      {/* <Text size="xs" c="dimmed" fw={700} mb={4} tt="uppercase" ls={1}>Tags</Text> */}

      <Group gap="xs" wrap="wrap" align="center">
        {/* 1. Render Applied Tags */}
        {appliedTags?.map((tag) => {
          return (
            <PaperTag
              key={tag.id.toString()}
              tag={tag}
              state={"applied"}
              active={appliedSet.has(tag.id.toString())}
              onApply={handleApplyExisting}
              onRemove={handleRemoveExisting}
            />
          );
        })}
        {suggestedToAllowed.map((tag) => {
          return (
            <PaperTag
              key={tag.id.toString()}
              tag={tag}
              state={"suggested"}
              active={appliedSet.has(tag.id.toString())}
              onApply={handleApplyExisting}
              onRemove={handleRemoveExisting}
            />
          );
        })}

        <TagPicker
          onSelectExisting={(tag) => handleApplyExisting(tag.id.toString())}
          onCreateNew={handleCreateAndAdd}
          omitIds={appliedTags?.map((t) => t.id.toString())}
          initialSuggestions={slicedOutSuggestions}
        />
      </Group>
    </div>
  );
}
