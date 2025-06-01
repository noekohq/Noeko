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
} from "@mantine/core";
import { DotsSixVertical, Info } from "@phosphor-icons/react";
import type { IdeaCardSharedProps, IIdea } from "./IdeaCardTypes"; // Ensure IIdea is imported if not re-exported
import { IdeaActionsGroup } from "./IdeaActionsGroup";
import { IdeaTagsDisplay } from "./IdeaTagsDisplay";
import { IdeaArtifactsDisplay } from "./IdeaArtifactsDisplay"; // Could be used for a single key artifact
import styles from "./IdeaCards.module.scss";
import { getNodeDescription } from "../../../utils/graph";
import { Link, useNavigate } from "react-router";

export interface CompactIdeaCardProps extends IdeaCardSharedProps {
  detailsForHoverCard?: React.ReactNode; // Typically the main summary for compact view
  hoverCardProps?: Partial<React.ComponentProps<typeof HoverCard>>;
  showTitleOnly?: boolean; // Extreme compact: only title and actions menu
  maxTitleLines?: number;
}

// Helper to get summary or a default
const getIdeaDefaultSummary = (idea: IIdea): string | undefined => {
  return getNodeDescription({
    ...idea,
    type: "idea",
  });
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
  showDefaultDragHandle,
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
  link,
}: CompactIdeaCardProps) {
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const effectiveDetailsForHover =
    detailsForHoverCard ?? getIdeaDefaultSummary(idea);

  const navigate = useNavigate();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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
      shadow={
        isExternallyHighlighted || isInternallyDragging ? "lg" : cardShadow
      }
      padding={cardPadding}
      radius={cardRadius}
      withBorder={!isInternallyDragging}
      draggable={draggable && showDefaultDragHandle} // Only make card draggable if default handle shown
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
      onMouseEnter={
        onMouseEnterCard
          ? (e) => onMouseEnterCard(e, idea.id.toString())
          : undefined
      }
      onMouseLeave={
        onMouseLeaveCard
          ? (e) => onMouseLeaveCard(e, idea.id.toString())
          : undefined
      }
      className={`${styles.ideaCardBase} ${styles.compactIdeaCard} ${className || ""} ${isInternallyDragging ? styles.dragging : ""} ${onCardClick ? styles.clickable : ""}`}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex
        justify="space-between"
        align="flex-start"
        gap="xs"
        style={{ width: "100%" }}
      >
        <Stack
          gap="xxs"
          style={{ flexGrow: 1, overflow: "hidden", minWidth: 0 }}
        >
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
          {/* Container for drag handle and actions */}
          {draggable && showDefaultDragHandle && <DotsSixVertical size={18} />}
          {actions.length > 0 && ( // Compact actions often just an overflow
            <IdeaActionsGroup
              idea={idea}
              actions={actions}
              visibleCount={0} // All go to overflow by default for compact
              buttonSize="xs"
              menuPosition="bottom-end"
              className={styles.compactActionsMenuIcon} // Style the icon itself
            />
          )}
        </Flex>
      </Flex>
      {/* Optionally, a very short description or more artifacts if not showTitleOnly */}
      {!showTitleOnly &&
        !artifacts?.length &&
        !tags?.length &&
        getIdeaDefaultSummary(idea) && (
          <Text
            size="xs"
            c="dimmed"
            lineClamp={1}
            mt="xxs"
            title={getIdeaDefaultSummary(idea)}
          >
            {getIdeaDefaultSummary(idea)}
          </Text>
        )}
    </Card>
  );

  if (effectiveDetailsForHover) {
    return (
      <HoverCard
        width={hoverCardProps?.width || 300}
        shadow={hoverCardProps?.shadow || "md"}
        withArrow={
          hoverCardProps?.withArrow === undefined
            ? true
            : hoverCardProps.withArrow
        }
        position={hoverCardProps?.position || "right-start"}
        openDelay={hoverCardProps?.openDelay || 350}
        closeDelay={hoverCardProps?.closeDelay || 200}
        disabled={isInternallyDragging} // Disable hovercard when dragging
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

export interface StandardIdeaCardProps extends IdeaCardSharedProps {
  description?: React.ReactNode; // Inline description
  detailsForHoverCard?: React.ReactNode; // Optional, for more details than inline description
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
  showDefaultDragHandle,
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

  const effectiveDescription =
    descriptionOverride ?? getIdeaDefaultSummary(idea);
  const effectiveDetailsForHover =
    detailsForHoverCard ??
    (effectiveDescription !== getIdeaDefaultSummary(idea)
      ? getIdeaDefaultSummary(idea)
      : undefined);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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
      shadow={
        isExternallyHighlighted || isInternallyDragging ? "lg" : cardShadow
      }
      padding={cardPadding}
      radius={cardRadius}
      withBorder={!isInternallyDragging}
      draggable={draggable && showDefaultDragHandle}
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
      onMouseEnter={
        onMouseEnterCard
          ? (e) => onMouseEnterCard(e, idea.id.toString())
          : undefined
      }
      onMouseLeave={
        onMouseLeaveCard
          ? (e) => onMouseLeaveCard(e, idea.id.toString())
          : undefined
      }
      className={`${styles.ideaCardBase} ${styles.standardIdeaCard} ${className || ""} ${isInternallyDragging ? styles.dragging : ""} ${onCardClick ? styles.clickable : ""}`}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap="xs" style={{ flexGrow: 1 }}>
        {/* Header Section: Drag Handle and Title/Artifacts */}
        <Flex justify="space-between" align="flex-start" gap="xs">
          <Stack
            gap="xs"
            style={{ flexGrow: 1, overflow: "hidden", minWidth: 0 }}
          >
            <Text fw={500} size="lg" lineClamp={2} title={idea.title}>
              {idea.title || "Untitled Idea"}
            </Text>
            {artifacts && artifacts.length > 0 && (
              <IdeaArtifactsDisplay artifacts={artifacts} size="xs" />
            )}
          </Stack>
          {draggable && showDefaultDragHandle && <DotsSixVertical size={20} />}
        </Flex>

        {/* Description */}
        {effectiveDescription && (
          <Text size="sm" c="dimmed" lineClamp={maxDescriptionLines}>
            {effectiveDescription}
          </Text>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <IdeaTagsDisplay
            tags={tags}
            size="sm"
            groupClassName={styles.standardTagsGroup}
          />
        )}

        {/* Spacer */}
        <Box style={{ flexGrow: 1 }} />

        {/* Actions */}
        {actions.length > 0 && (
          <IdeaActionsGroup
            idea={idea}
            actions={actions}
            visibleCount={visibleActionsCount}
            buttonSize="xs"
            groupClassName={styles.actionsGroupWrapper} // Adds top border etc.
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
        withArrow={
          hoverCardProps?.withArrow === undefined
            ? true
            : hoverCardProps.withArrow
        }
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
  description?: React.ReactNode; // Primary inline content, can be longer
  detailsSectionContent?: React.ReactNode; // Additional structured detailed content
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
  showDefaultDragHandle,
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
  visibleActionsCount = 3, // Might show more actions by default
  link,
}: DetailedIdeaCardProps) {
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const effectiveDescription =
    descriptionOverride ?? getIdeaDefaultSummary(idea);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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
      shadow={
        isExternallyHighlighted || isInternallyDragging ? "lg" : cardShadow
      }
      padding={cardPadding}
      radius={cardRadius}
      withBorder={!isInternallyDragging}
      draggable={draggable && showDefaultDragHandle}
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
      onMouseEnter={
        onMouseEnterCard
          ? (e) => onMouseEnterCard(e, idea.id.toString())
          : undefined
      }
      onMouseLeave={
        onMouseLeaveCard
          ? (e) => onMouseLeaveCard(e, idea.id.toString())
          : undefined
      }
      className={`${styles.ideaCardBase} ${styles.detailedIdeaCard} ${className || ""} ${isInternallyDragging ? styles.dragging : ""} ${onCardClick ? styles.clickable : ""}`}
      style={{
        ...style,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap="md" style={{ flexGrow: 1 }}>
        {" "}
        {/* Increased gap for detailed view */}
        {/* Header Section */}
        <Flex justify="space-between" align="flex-start" gap="xs">
          <Stack
            gap="xs"
            style={{ flexGrow: 1, overflow: "hidden", minWidth: 0 }}
          >
            <Text fw={500} size="xl" title={idea.title}>
              {" "}
              {/* Larger title */}
              {idea.title || "Untitled Idea"}
            </Text>
            {artifacts && artifacts.length > 0 && (
              <IdeaArtifactsDisplay artifacts={artifacts} size="sm" /> // Slightly larger artifacts
            )}
          </Stack>
          {draggable && showDefaultDragHandle && (
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
        {/* Main Description / Content */}
        {effectiveDescription && (
          <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
            {" "}
            {/* Allow multi-line, pre-wrap */}
            {effectiveDescription}
          </Text>
        )}
        {/* Additional Details Section */}
        {detailsSectionContent && (
          <Box mt="xs">
            <Divider my="sm" />
            {detailsSectionContent}
          </Box>
        )}
        {/* Tags */}
        {tags && tags.length > 0 && (
          <Box mt="xs">
            <IdeaTagsDisplay
              tags={tags}
              size="sm"
              groupClassName={styles.detailedTagsGroup}
            />
          </Box>
        )}
        {/* Spacer */}
        <Box style={{ flexGrow: 1 }} />
        {/* Actions */}
        {actions.length > 0 && (
          <IdeaActionsGroup
            idea={idea}
            actions={actions}
            visibleCount={visibleActionsCount}
            buttonSize="sm" // Slightly larger buttons for detailed view
            groupClassName={styles.actionsGroupWrapper}
          />
        )}
      </Stack>
    </Card>
  );
}
