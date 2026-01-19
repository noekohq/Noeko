import React, { useMemo, useState } from "react";
import styles from "./ScopeBuilder.module.scss";
import { IConnectableSearchQuery } from "../../../../app/services/Search";
import { Group, Popover } from "@mantine/core";
import useFetch from "../../../hooks/useFetch";
import { ITag } from "../../../../app/database/models/tag";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import PaperTag from "../../Display/Paper/Tags/PaperTag";
import { CalendarIcon, FunnelIcon, XIcon } from "@phosphor-icons/react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";
import PaperButton from "../../Display/Paper/PaperButton";
import { Tabs } from "../../UI/Layout/Utils/Tabs";
import HorizonSelector from "../../Display/Paper/Inputs/HorizonSelector";
import { toYYYYMMDD } from "../../../utils/datetime";
import { TagPickerContent } from "../../Display/Interactions/Tags/TagPicker";
import { RabbitholePickerContent } from "../../Display/Interactions/Rabbitholes/RabbitholePicker";
import { useLandscape } from "../../../contexts/LandscapeContext";

export type IScope = Pick<
  IConnectableSearchQuery,
  "tags" | "rabbithole" | "date"
> & {
  showShared?: boolean;
  showFriends?: boolean;
};

export interface IScopeBuilderProps {
  value: IScope;
  onChange: (scope: IScope) => void;
}

const ScopePill = ({
  icon,
  label,
  onRemove,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
  className?: string;
}) => {
  return (
    <button
      className={`${styles.scopePill} ${className || ""}`}
      onClick={onRemove}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
};

const ScopeBuilder: React.FC<IScopeBuilderProps> = ({ value, onChange }) => {
  const [existingTags, setExistingTags] = useState<ITag[]>([]);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tag");

  const {
    rabbitholes: {
      entered: { set: setRabbithole, get: currentRabbithole },
    },
  } = useLandscape();

  const handleAddTag = (tag: ITag) => {
    setExistingTags((prev) => {
      if (prev.some((t) => t.id.toString() === tag.id.toString())) return prev;
      return [...prev, tag];
    });
    const currentSet = value.tags?.set || [];
    if (!currentSet.some((id) => id.toString() === tag.id.toString())) {
      onChange({
        ...value,
        tags: {
          set: [...currentSet, tag.id.toString()],
          behavior: value.tags?.behavior || "or",
        },
      });
    }
  };

  const handleRemoveTag = (tagId: string) => {
    const currentSet = value.tags?.set || [];
    onChange({
      ...value,
      tags: {
        ...value.tags,
        set: currentSet.filter((id) => id.toString() !== tagId),
        behavior: value.tags?.behavior || "or",
      },
    });
  };

  const handleSetRabbithole = (rh: IRabbithole) => {
    setRabbithole(rh);
    setPopoverOpened(false);
  };

  const handleRemoveRabbithole = () => {
    setRabbithole(null);
  };

  // --- Date Logic ---
  const handleDateChange = (val: string | null) => {
    if (!val) {
      onChange({ ...value, date: undefined });
      return;
    }
    // Assume val is YYYY-MM-DD. Set as "After" this date? Or "On" this date?
    // For a single date selection, usually implies "On".
    // "After": new Date(val).toISOString()
    const d = new Date(val);
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);

    onChange({
      ...value,
      date: {
        updatedAt: {
          after: d.toISOString(),
          before: nextDay.toISOString(),
        },
      },
    });
    setPopoverOpened(false);
  };

  const handleRemoveDate = () => {
    onChange({ ...value, date: undefined });
  };

  // Date Label
  const dateLabel = useMemo(() => {
    if (!value.date?.updatedAt?.after) return "Date";
    // Convert to local date string to match input
    return new Date(value.date.updatedAt.after).toLocaleDateString();
  }, [value.date]);

  return (
    <Group className={styles.scopeBuilderContainer} gap="xs">
      {/* Rabbithole Pill */}
      {currentRabbithole && (
        <ScopePill
          className={styles.rabbitholePill}
          icon={<RabbitholeIcon size={12} />}
          label={currentRabbithole.name}
          onRemove={handleRemoveRabbithole}
        />
      )}

      {/* Date Pill */}
      {value.date && (
        <ScopePill
          className={styles.datePill}
          icon={<CalendarIcon size={14} weight="bold" />}
          label={dateLabel}
          onRemove={handleRemoveDate}
        />
      )}

      {/* Tag Pills */}
      {value.tags?.set.map((tagId) => {
        const tag = existingTags?.find(
          (t) => t.id.toString() === tagId.toString(),
        );
        // If we don't have the tag object yet (e.g. initial load), we might render a skeleton or just wait.
        // For now, only render if we have it.
        if (!tag) return null;

        return (
          <PaperTag
            key={tagId.toString()}
            state="applied"
            tag={tag}
            onRemove={() => handleRemoveTag(tagId.toString())}
            active={true}
          />
        );
      })}

      <Popover
        position="bottom-start"
        withArrow
        opened={popoverOpened}
        onChange={setPopoverOpened}
        trapFocus
        shadow="md"
        width={360}
      >
        <Popover.Target>
          <div onClick={() => setPopoverOpened((o) => !o)}>
            <button className={styles.filterPill}>
              <span className={styles.icon}>
                {popoverOpened ? (
                  <XIcon weight="bold" size={12} />
                ) : (
                  <FunnelIcon weight="bold" size={12} />
                )}
              </span>
              <span className={styles.label}>Add Filter</span>
            </button>
          </div>
        </Popover.Target>
        <Popover.Dropdown className={styles.popoverContent} p="xs">
          <Tabs defaultValue="tag" onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="tag">Tags</Tabs.Tab>
              <Tabs.Tab value="rabbithole">Rabbitholes</Tabs.Tab>
              <Tabs.Tab value="date">Date</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="tag">
              <TagPickerContent
                onSelectExisting={handleAddTag}
                allowCreation={false}
                onClose={() => setPopoverOpened(false)}
                omitIds={value.tags?.set.map((id) => id.toString())}
              />
            </Tabs.Panel>

            <Tabs.Panel value="rabbithole">
              <RabbitholePickerContent
                onSelectExisting={handleSetRabbithole}
                allowCreation={false}
                onClose={() => setPopoverOpened(false)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="date">
              <HorizonSelector
                type="date"
                value={
                  value.date?.updatedAt?.after
                    ? toYYYYMMDD(new Date(value.date.updatedAt.after))
                    : null
                }
                onChange={handleDateChange}
              />
            </Tabs.Panel>
          </Tabs>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
};

export default ScopeBuilder;
