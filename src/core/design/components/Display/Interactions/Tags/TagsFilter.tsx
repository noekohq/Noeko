import { Group, ScrollArea, Box } from "@mantine/core";
import { ITag } from "../../../../../../../shared/types/tags";
import { TagPicker } from "./TagPicker"; // Reusing your existing picker
import PaperTag from "@core/design/components/Paper/Tags/PaperTag";
import styles from "./TagsFilter.module.scss";

interface TagsFilterProps {
  /** The currently active filters. Pass full objects to avoid re-fetching. */
  value: ITag[];
  /** Callback when the filter selection changes */
  onChange: (tags: ITag[]) => void;
  /** Optional: If you want to allow creating tags from the filter (usually false for search) */
  allowCreation?: boolean;
}

export default function TagsFilter({ value, onChange, allowCreation = false }: TagsFilterProps) {
  const handleSelect = (tag: ITag) => {
    if (value.some((t) => t.id.toString() === tag.id.toString())) return;
    onChange([...value, tag]);
  };

  const handleRemove = (tagId: string) => {
    onChange(value.filter((t) => t.id.toString() !== tagId));
  };

  // Dummy create handler if allowed, otherwise we might modify TagPicker
  // to accept a prop that hides the creation UI, but for now we just handle it.
  const handleCreate = async (name: string, description: string, color: string) => {
    if (!allowCreation) return;
    // Logic to create tag and add to filter would go here
    // For a pure filter, we might just ignore this or implement if needed.
  };

  return (
    <div className={styles.tagsFilter}>
      <ScrollArea type="never" scrollbars="x">
        <Group className={styles.scrollGroup} gap="xs" wrap="nowrap">
          {/* 1. The Picker (Always accessible) */}
          <div className={styles.pickerWrapper}>
            <TagPicker
              onSelectExisting={handleSelect}
              allowCreation={false}
              omitIds={value.map((t) => t.id.toString())}
            />
          </div>

          {value.map((tag) => (
            <PaperTag
              key={tag.id.toString()}
              tag={tag}
              state="applied"
              active={true}
              onRemove={() => handleRemove(tag.id.toString())}
            />
          ))}
        </Group>
      </ScrollArea>
    </div>
  );
}
