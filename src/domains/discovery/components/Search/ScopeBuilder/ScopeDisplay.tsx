import React, { useMemo } from "react";
import styles from "./ScopeBuilder.module.scss"; // Keeping same styles for now
import { Group } from "@mantine/core";
import { RabbitholeIcon } from '@core/design/icons/Icons';
import { CalendarIcon } from "@phosphor-icons/react";
import PaperTag from '@core/design/components/Paper/Tags/PaperTag';
import { useSearch } from '@domains/discovery/contexts/SearchContext';
import { useLandscape } from '@/contexts/LandscapeContext';

export interface IScopeDisplayProps {}

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
    <button className={`${styles.scopePill} ${className || ""}`} onClick={onRemove}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
};

export default function ScopeDisplay() {
  const {
    global: {
      scope: { get: value, set: onChange },
      scopeData: {
        tags: { get: scopeTags, remove: removeTag },
      },
    },
  } = useSearch();

  const {
    rabbitholes: {
      entered: { get: currentRabbithole, set: setRabbithole },
    },
  } = useLandscape();

  const handleRemoveRabbithole = () => {
    setRabbithole(null);
  };

  const handleRemoveDate = () => {
    onChange({ ...value, date: undefined });
  };

  const dateLabel = useMemo(() => {
    if (!value.date) return "Date";

    const field = Object.keys(value.date)[0] as "createdAt" | "updatedAt" | "viewedAt";
    if (!field) return "Date";

    const dateRange = value.date[field];
    if (!dateRange?.after || !dateRange?.before) return "Date";

    const startDate = new Date(dateRange.after);
    const endDate = new Date(dateRange.before);

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };

    if (startDate.getFullYear() !== endDate.getFullYear()) {
      formatOptions.year = "numeric";
    }

    const fromStr = startDate.toLocaleDateString("en-US", formatOptions);
    const toStr = endDate.toLocaleDateString("en-US", formatOptions);

    return `${fromStr} - ${toStr}`;
  }, [value.date]);

  const hasItems = useMemo(() => {
    return !!currentRabbithole || !!value.date || (value.tags?.set && value.tags.set.length > 0);
  }, [currentRabbithole, value.date, value.tags?.set]);

  if (!hasItems) return null;

  return (
    <Group className={styles.scopeBuilderContainer} gap="xs">
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

      {value.tags?.set.map((tagId) => {
        const tag = scopeTags.find((t) => t.id.toString() === tagId.toString());
        if (!tag) return null;

        return (
          <PaperTag
            key={tagId.toString()}
            state="applied"
            tag={tag}
            onRemove={() => removeTag(tagId.toString())}
            active={true}
          />
        );
      })}
    </Group>
  );
}
