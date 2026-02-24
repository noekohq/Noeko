import { Group } from "@mantine/core";
import { IConnectable } from "../../../../../app/services/Graph"; // Adjust
import useConnectable from "@domains/knowledge/hooks/useConnectable"; // Adjust
import { useEffect, useState } from "react";
import { TagPicker } from "./TagPicker"; // Import the new component
import { createTagAndAddToThing } from "@domains/knowledge/utils/tags"; // Adjust
import styles from "./TagsManager.module.scss";
import PaperTag from "@core/design/components/Paper/Tags/PaperTag";
import { useLayout } from "@/contexts/LayoutContext";

type ITagsManagerProps = {
  connectable: IConnectable;
  maxSuggested: number;
};

export default function TagsManager({ connectable, maxSuggested }: ITagsManagerProps) {
  const { isMobile } = useLayout();
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
  }, [connectable.id.toString(), connectable.embeddingsUpdatedAt.toString()]);

  const handleCreateAndAdd = async (name: string, description: string, color: string) => {
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

  const filteredSuggested = suggestedTags.filter((t) => !appliedSet.has(t.id.toString()));
  const suggestedToAllowed = showingAll
    ? filteredSuggested
    : filteredSuggested.slice(0, maxSuggested);
  const slicedOutSuggestions = showingAll ? [] : filteredSuggested.slice(maxSuggested);

  return (
    <div className={styles.tagsManager}>
      {/* Optional: Minimal header, or remove entirely for pure "flow" */}
      {/* <Text size="xs" c="dimmed" fw={700} mb={4} tt="uppercase" ls={1}>Tags</Text> */}

      <Group
        gap="xs"
        wrap={isMobile ? "nowrap" : "wrap"}
        align="center"
        className={isMobile ? styles.mobileGroup : ""}
      >
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
