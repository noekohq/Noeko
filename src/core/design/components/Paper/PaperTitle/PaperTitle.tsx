import { useLayoutEffect, useRef } from "react";
import { Title, ActionIcon, Tooltip, Group, Badge } from "@mantine/core";
import { SparkleIcon } from "@phosphor-icons/react";
import styles from "./PaperTitle.module.scss";

interface PaperTitleProps {
  title: string;
  onUpdate: (newTitle: string) => void;
  canEdit?: boolean;
  isViewOnly?: boolean;
  needsGeneration?: boolean;
  onGenerate?: () => void;
  generationLabel?: string;
  isGenerating?: boolean;
  wasGenerated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function PaperTitle({
  title: initialTitle,
  onUpdate,
  canEdit = true,
  isViewOnly = false,
  needsGeneration = false,
  onGenerate,
  generationLabel = "Generate title",
  isGenerating = false,
  wasGenerated = false,
  className,
  style,
}: PaperTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    if (titleRef.current && titleRef.current.innerText !== initialTitle) {
      titleRef.current.innerText = initialTitle;
    }
  }, [initialTitle]);

  const handleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.innerText.trim();
    if (newTitle !== initialTitle) {
      onUpdate(newTitle);
    }
  };

  return (
    <Group gap="xs">
      <Title
        ref={titleRef}
        order={1}
        m="0"
        pr="md"
        contentEditable={canEdit}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={[styles.paperTitle, className].filter(Boolean).join(" ")}
        style={{
          opacity: canEdit ? 1 : 0.7,
          ...style,
          cursor: canEdit ? "text" : "default",
        }}
      />

      {isViewOnly && (
        <Badge color="gray" variant="outline">
          View Only
        </Badge>
      )}

      {needsGeneration && !isGenerating && (
        <Tooltip label={generationLabel}>
          <ActionIcon
            aria-label={generationLabel}
            onClick={onGenerate}
            variant="light"
            size="md"
            radius="md"
            color="gray"
            disabled={!canEdit}
          >
            <SparkleIcon size={14} weight="duotone" />
          </ActionIcon>
        </Tooltip>
      )}

      {isGenerating && <ActionIcon loading variant="transparent" color="gray" size="md" />}

      {wasGenerated && !isGenerating && (
        <Tooltip label="This title was generated automatically.">
          <div className={styles.generatedIndicator}>
            <SparkleIcon />
          </div>
        </Tooltip>
      )}
    </Group>
  );
}
