import React, { useState } from "react";
import {
  Card,
  Text,
  Stack,
  Flex,
  Box,
  HoverCard,
  ActionIcon,
  Tooltip,
  Divider,
  Group,
} from "@mantine/core";
import { DotsSixVertical, Info } from "@phosphor-icons/react";
import type { IdeaCardSharedProps } from "./IdeaCardTypes"; // Ensure IIdea is imported if not re-exported
import { IdeaActionsGroup } from "./IdeaActionsGroup";
import { IdeaTagsDisplay } from "./IdeaTagsDisplay";
import { IdeaArtifactsDisplay } from "./IdeaArtifactsDisplay"; // Could be used for a single key artifact
import styles from "./IdeaCards.module.scss";
import { getNodeDescription } from '@/utils/graph';
import { Link, useNavigate } from "react-router";
import { ISafeIdea } from "../../../../shared/types/idea";

export interface CompactIdeaCardProps extends IdeaCardSharedProps {
  detailsForHoverCard?: React.ReactNode;
  hoverCardProps?: Partial<React.ComponentProps<typeof HoverCard>>;
  showTitleOnly?: boolean;
  maxTitleLines?: number;
  maxDescriptionLines?: number;
  description?: string;
  withBorder?: boolean;
}

// Helper to get summary or a default
const getIdeaDefaultSummary = (idea: ISafeIdea): string | undefined => {
  const desc = getNodeDescription({
    ...idea,
    type: "idea",
  });
  return desc;
};

export function CompactIdeaCard({
  idea,
  artifacts,
  tags,
  actions = [],
  onCardClick,
  draggable,
  onDragStartCard,
  onDragEndCard,
  isExternallyHighlighted,
  onMouseEnterCard,
  onMouseLeaveCard,
  className,
  cardPadding = "sm",
  cardRadius = "md",
  cardShadow = "sm",
  style,
  detailsForHoverCard,
  hoverCardProps,
  showTitleOnly = false,
  maxTitleLines = 2,
  maxDescriptionLines = 2,
  link,
  description,
  withBorder = true,
}: CompactIdeaCardProps) {
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const effectiveDetailsForHover = detailsForHoverCard ?? getIdeaDefaultSummary(idea);

  const navigate = useNavigate();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ideaId: idea.id.toString(),
      })
    );
    if (draggable) {
      setIsInternallyDragging(true);
      onDragStartCard?.(e, idea);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggable) {
      setIsInternallyDragging(false);
      onDragEndCard?.(e, idea);
    }
  };

  const cardContent = (
    <Card
      data-idea-id={idea.id.toString()}
      shadow={isExternallyHighlighted || isInternallyDragging ? "lg" : cardShadow}
      padding={cardPadding}
      radius={cardRadius}
      withBorder={withBorder}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={
        link || onCardClick
          ? (e: React.MouseEvent<HTMLDivElement>) => {
              if (onCardClick) {
                onCardClick(e, idea);
              }
              if (link) {
                navigate(`/idea/${idea.id.toString()}`);
              }
            }
          : undefined
      }
      onMouseEnter={onMouseEnterCard ? (e) => onMouseEnterCard(e, idea.id.toString()) : undefined}
      onMouseLeave={onMouseLeaveCard ? (e) => onMouseLeaveCard(e, idea.id.toString()) : undefined}
      className={`${styles.ideaCardBase} ${styles.compactIdeaCard} ${className || ""} ${isInternallyDragging ? styles.dragging : ""} ${onCardClick || link ? styles.clickable : ""}`}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex justify="space-between" align="flex-start" gap="xs" style={{ width: "100%" }}>
        <Stack gap="xxs" style={{ flexGrow: 1, overflow: "hidden", minWidth: 0 }}>
          <Group wrap="wrap" gap="xs">
            <Text fw={500} size="sm" lineClamp={maxTitleLines} title={idea.title}>
              {idea.title || "Untitled Idea"}
            </Text>
            {!showTitleOnly && artifacts && artifacts.length > 0 && (
              <IdeaArtifactsDisplay
                artifacts={artifacts.slice(0, 1)}
                size="xs"
                groupClassName={styles.compactArtifactsGroup}
              />
            )}
          </Group>
          {!showTitleOnly &&
            tags &&
            tags.length > 0 &&
            !artifacts?.length && ( // Show tags if no artifact shown
              <IdeaTagsDisplay
                tags={tags}
                visibleCount={2}
                size="xs"
                groupClassName={styles.compactTagsGroup}
              />
            )}
        </Stack>

        <Flex align="center" gap={4}>
          {" "}
          {draggable && <DotsSixVertical size={18} />}
          {actions.length > 0 && (
            <IdeaActionsGroup
              idea={idea}
              actions={actions}
              visibleCount={0}
              buttonSize="xs"
              menuPosition="bottom-end"
              className={styles.compactActionsMenuIcon}
            />
          )}
        </Flex>
      </Flex>

      {description ? (
        <Text
          size="xs"
          c="dimmed"
          lineClamp={maxDescriptionLines}
          mt="xxs"
          title={getIdeaDefaultSummary(idea)}
        >
          {description}
        </Text>
      ) : (
        !showTitleOnly &&
        !artifacts?.length &&
        !tags?.length &&
        getIdeaDefaultSummary(idea) && (
          <Text
            size="xs"
            c="dimmed"
            lineClamp={maxDescriptionLines}
            mt="xxs"
            title={getIdeaDefaultSummary(idea)}
          >
            {getIdeaDefaultSummary(idea)}
          </Text>
        )
      )}
    </Card>
  );

  if (effectiveDetailsForHover) {
    return (
      <HoverCard
        width={hoverCardProps?.width || 300}
        styles={{
          dropdown: {
            maxHeight: "calc(50vh - 200px)",
            overflow: "auto",
            overflowX: "hidden",
          },
        }}
        shadow={hoverCardProps?.shadow || "md"}
        withArrow={hoverCardProps?.withArrow === undefined ? true : hoverCardProps.withArrow}
        position={hoverCardProps?.position || "right-start"}
        openDelay={hoverCardProps?.openDelay || 350}
        closeDelay={hoverCardProps?.closeDelay || 200}
        disabled={isInternallyDragging}
        {...hoverCardProps}
      >
        <HoverCard.Target>{cardContent}</HoverCard.Target>
        <HoverCard.Dropdown p="sm">
          <Stack gap="xs">
            <Text fw={500} c="dimmed" size="sm">
              {idea.title}
            </Text>
            {typeof effectiveDetailsForHover === "string" ? (
              <Text size="sm">{effectiveDetailsForHover}</Text>
            ) : (
              effectiveDetailsForHover
            )}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    );
  }
  return cardContent;
}

export interface StandardIdeaCardProps extends IdeaCardSharedProps {
  description?: React.ReactNode;
  detailsForHoverCard?: React.ReactNode;
  hoverCardProps?: Partial<React.ComponentProps<typeof HoverCard>>;
  visibleActionsCount?: number;
  maxDescriptionLines?: number;
}

export function StandardIdeaCard({
  idea,
  artifacts,
  tags,
  actions = [],
  onCardClick,
  draggable,
  onDragStartCard,
  onDragEndCard,
  isExternallyHighlighted,
  onMouseEnterCard,
  onMouseLeaveCard,
  className,
  cardPadding = "md",
  cardRadius = "md",
  cardShadow = "sm",
  style,
  description: descriptionOverride,
  detailsForHoverCard,
  hoverCardProps,
  visibleActionsCount = 2,
  maxDescriptionLines = 3,
  link,
}: StandardIdeaCardProps) {
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const effectiveDescription = descriptionOverride ?? getIdeaDefaultSummary(idea);
  const effectiveDetailsForHover = detailsForHoverCard ?? getIdeaDefaultSummary(idea);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ideaId: idea.id.toString(),
      })
    );
    if (draggable) {
      setIsInternallyDragging(true);
      onDragStartCard?.(e, idea);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggable) {
      setIsInternallyDragging(false);
      onDragEndCard?.(e, idea);
    }
  };

  const navigate = useNavigate();

  const cardContent = (
    <Card
      data-idea-id={idea.id.toString()}
      shadow={isExternallyHighlighted || isInternallyDragging ? "lg" : cardShadow}
      padding={cardPadding}
      radius={cardRadius}
      withBorder={!isInternallyDragging}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={
        link || onCardClick
          ? (e: React.MouseEvent<HTMLDivElement>) => {
              if (onCardClick) {
                onCardClick(e, idea);
              }
              if (link) {
                navigate(`/idea/${idea.id.toString()}`);
              }
            }
          : undefined
      }
      onMouseEnter={onMouseEnterCard ? (e) => onMouseEnterCard(e, idea.id.toString()) : undefined}
      onMouseLeave={onMouseLeaveCard ? (e) => onMouseLeaveCard(e, idea.id.toString()) : undefined}
      className={`${styles.ideaCardBase} ${styles.standardIdeaCard} ${className || ""} ${isInternallyDragging ? styles.dragging : ""} ${onCardClick ? styles.clickable : ""}`}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap="xs" style={{ flexGrow: 1 }}>
        <Flex justify="space-between" align="flex-start" gap="xs">
          <Stack gap="xs" style={{ flexGrow: 1, overflow: "hidden", minWidth: 0 }}>
            <Text size="md" c="dimmed" fw={500} lineClamp={2} title={idea.title}>
              {idea.title || "Untitled Idea"}
            </Text>
            {artifacts && artifacts.length > 0 && (
              <IdeaArtifactsDisplay artifacts={artifacts} size="xs" />
            )}
          </Stack>
          {draggable && <DotsSixVertical size={20} />}
        </Flex>

        {effectiveDescription && (
          <Text size="sm" lineClamp={maxDescriptionLines}>
            {effectiveDescription}
          </Text>
        )}

        {tags && tags.length > 0 && (
          <IdeaTagsDisplay tags={tags} size="sm" groupClassName={styles.standardTagsGroup} />
        )}

        <Box style={{ flexGrow: 1 }} />

        {actions.length > 0 && (
          <IdeaActionsGroup
            idea={idea}
            actions={actions}
            visibleCount={visibleActionsCount}
            buttonSize="xs"
            groupClassName={styles.actionsGroupWrapper}
          />
        )}
      </Stack>
    </Card>
  );

  if (effectiveDetailsForHover && !isInternallyDragging) {
    return (
      <HoverCard
        width={hoverCardProps?.width || 350}
        shadow={hoverCardProps?.shadow || "md"}
        withArrow={hoverCardProps?.withArrow === undefined ? true : hoverCardProps.withArrow}
        position={hoverCardProps?.position || "right-start"}
        openDelay={hoverCardProps?.openDelay || 350}
        closeDelay={hoverCardProps?.closeDelay || 200}
        disabled={isInternallyDragging}
        {...hoverCardProps}
      >
        <HoverCard.Target>{cardContent}</HoverCard.Target>
        <HoverCard.Dropdown p="sm">
          <Stack>
            <Text fw={500}>{idea.title}</Text>
            {typeof effectiveDetailsForHover === "string" ? (
              <Text size="sm">{effectiveDetailsForHover}</Text>
            ) : (
              effectiveDetailsForHover
            )}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    );
  }

  return cardContent;
}

export interface DetailedIdeaCardProps extends IdeaCardSharedProps {
  description?: React.ReactNode;
  detailsSectionContent?: React.ReactNode;
  visibleActionsCount?: number;
}

export function DetailedIdeaCard({
  idea,
  artifacts,
  tags,
  actions = [],
  onCardClick,
  draggable,
  onDragStartCard,
  onDragEndCard,
  isExternallyHighlighted,
  onMouseEnterCard,
  onMouseLeaveCard,
  className,
  cardPadding = "md",
  cardRadius = "md",
  cardShadow = "sm",
  style,
  description: descriptionOverride,
  detailsSectionContent,
  visibleActionsCount = 3,
  link,
}: DetailedIdeaCardProps) {
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const effectiveDescription = descriptionOverride ?? getIdeaDefaultSummary(idea);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ideaId: idea.id.toString(),
      })
    );
    if (draggable) {
      setIsInternallyDragging(true);
      onDragStartCard?.(e, idea);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggable) {
      setIsInternallyDragging(false);
      onDragEndCard?.(e, idea);
    }
  };

  const navigate = useNavigate();

  return (
    <Card
      data-idea-id={idea.id.toString()}
      shadow={isExternallyHighlighted || isInternallyDragging ? "lg" : cardShadow}
      padding={cardPadding}
      radius={cardRadius}
      withBorder={!isInternallyDragging}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={
        link || onCardClick
          ? (e: React.MouseEvent<HTMLDivElement>) => {
              if (onCardClick) {
                onCardClick(e, idea);
              }
              if (link) {
                navigate(`/idea/${idea.id.toString()}`);
              }
            }
          : undefined
      }
      onMouseEnter={onMouseEnterCard ? (e) => onMouseEnterCard(e, idea.id.toString()) : undefined}
      onMouseLeave={onMouseLeaveCard ? (e) => onMouseLeaveCard(e, idea.id.toString()) : undefined}
      className={`${styles.ideaCardBase} ${styles.detailedIdeaCard} ${className || ""} ${isInternallyDragging ? styles.dragging : ""} ${onCardClick ? styles.clickable : ""}`}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap="xs" style={{ flexGrow: 1 }}>
        <Flex justify="space-between" align="flex-start" gap="xs">
          <Group gap="xs" style={{ flexGrow: 1, overflow: "hidden", minWidth: 0 }}>
            <Text fw={500} size="xl" title={idea.title}>
              {" "}
              {idea.title || "Untitled Idea"}
            </Text>
            {artifacts && artifacts.length > 0 && (
              <IdeaArtifactsDisplay artifacts={artifacts} size="sm" />
            )}
          </Group>
          {draggable && (
            <Tooltip label="Drag to reorder" withArrow openDelay={500}>
              <ActionIcon
                variant="subtle"
                color="gray"
                className={styles.dragHandleIcon}
                style={{ cursor: "grab" }}
                aria-label="Drag idea"
              >
                <DotsSixVertical size={20} />
              </ActionIcon>
            </Tooltip>
          )}
        </Flex>

        {effectiveDescription && (
          <>
            <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
              {effectiveDescription}
            </Text>
            {detailsSectionContent && <Divider my="md" />}
          </>
        )}

        {detailsSectionContent && <Box>{detailsSectionContent}</Box>}

        {tags && tags.length > 0 && (
          <Box mt="xs">
            <IdeaTagsDisplay tags={tags} size="sm" groupClassName={styles.detailedTagsGroup} />
          </Box>
        )}

        <Box style={{ flexGrow: 1 }} />

        {actions.length > 0 && (
          <IdeaActionsGroup
            idea={idea}
            actions={actions}
            visibleCount={visibleActionsCount}
            buttonSize="sm"
            groupClassName={styles.actionsGroupWrapper}
          />
        )}
      </Stack>
    </Card>
  );
}
