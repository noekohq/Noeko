import React from "react";
import { IResultsMap } from "../../../hooks/useSpyglassService";
import { Badge, Group, Space, Stack, Text, Title } from "@mantine/core";
import { TypeIcon, getTypeFromId } from "../../../utils/graph";
import { INode } from "../../../declarations/graph";
import GridCard from "../../Display/Paper/Things/GridCard";
import PaperThing from "../../Display/Paper/Things/PaperThing";
import { IThing } from "../../Display/Paper/Things/things";
import styles from "./GlimpseModeDisplay.module.scss";
import { PartialGlimpseResult } from "../../../utils/partialJsonParser";
import {
  ArrowRightIcon,
  CompassIcon,
  LightbulbIcon,
  ListChecksIcon,
  QuestionIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { IResultSetType } from "../../../../app/services/Spyglass";
import PaperButton from "../../Display/Paper/PaperButton";
import { SpyglassIcon } from "../Icons/Icons";
import LangtonsAntLoader from "../Loading/AntLoader";

interface IGlimpseModeDisplayProps {
  glimpseResult: PartialGlimpseResult;
  resultsMap: IResultsMap;
  query: string;
  loading?: boolean;
  status?: string | null;
  view?: "compact" | "full";
  includeNavigationPrompt?: boolean;
  onResultClick?: (node: INode) => void;
}

/**
 * Get icon for section type
 */
const getSectionIcon = (sectionType?: IResultSetType) => {
  switch (sectionType) {
    case "foundational":
      return TreeStructureIcon;
    case "examples":
      return LightbulbIcon;
    case "questions":
      return QuestionIcon;
    case "actions":
      return ListChecksIcon;
    case "related":
      return CompassIcon;
    default:
      return null;
  }
};

/**
 * Get label for section type
 */
const getSectionTypeLabel = (sectionType?: IResultSetType): string => {
  switch (sectionType) {
    case "foundational":
      return "Foundation";
    case "examples":
      return "Examples";
    case "questions":
      return "Questions";
    case "actions":
      return "Actions";
    case "related":
      return "Related";
    default:
      return "";
  }
};

/**
 * Get color for section type badge
 */
const getSectionTypeColor = (sectionType?: IResultSetType): string => {
  switch (sectionType) {
    case "foundational":
      return "blue";
    case "examples":
      return "teal";
    case "questions":
      return "yellow";
    case "actions":
      return "grape";
    case "related":
      return "gray";
    default:
      return "gray";
  }
};

/**
 * Get label for relationship type
 */
const getRelationshipLabel = (relationship?: string): string | null => {
  switch (relationship) {
    case "answers":
      return "Answers";
    case "expands":
      return "Expands";
    case "contrasts":
      return "Contrasts";
    case "supports":
      return "Supports";
    case "questions":
      return "Questions";
    default:
      return null;
  }
};

const GlimpseModeDisplay: React.FC<IGlimpseModeDisplayProps> = ({
  glimpseResult,
  resultsMap,
  query,
  loading = false,
  status,
  view = "full",
  includeNavigationPrompt = false,
  onResultClick,
}) => {
  const navigate = useNavigate();
  const sourceCount = Object.keys(resultsMap).length;

  const entryPointResource = glimpseResult.entryPoint
    ? resultsMap[glimpseResult.entryPoint.resourceId]
    : null;

  const entryPointId = glimpseResult.entryPoint?.resourceId;

  const connectionCount = glimpseResult.connections?.length ?? 0;

  if (
    loading &&
    !glimpseResult.summary &&
    (glimpseResult.contentMap?.length ?? 0) === 0
  ) {
    return (
      <div className={styles.loadingState}>
        <Title
          order={view === "full" ? 1 : 3}
          className={`${styles.queryTitle} ${styles.loading}`}
        >
          {query}
        </Title>
        {status && (
          <Text size="sm" c="dimmed" mt="xs">
            {status}
          </Text>
        )}
        <div className={styles.loaderContainer}>
          <LangtonsAntLoader cellSize={10} stepsPerSecond={4} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.editorialWrapper} ${styles[view]}`}>
      <Stack gap="8px">
        <Title
          order={view === "full" ? 1 : 3}
          className={`${styles.queryTitle} ${loading && styles.loading}`}
        >
          {query}
        </Title>

        {view === "full" && (
          <Text size="xs" c="dimmed" className={styles.byline}>
            {sourceCount > 0 && (
              <>
                <span>
                  {sourceCount} resource{sourceCount !== 1 ? "s" : ""} analyzed
                </span>
                <span className={styles.bylineDot}> • </span>
                <span>{glimpseResult.contentMap.length} themes explored</span>
                {connectionCount > 0 && (
                  <>
                    <span className={styles.bylineDot}> • </span>
                    <span>
                      {connectionCount} connection
                      {connectionCount !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </>
            )}
          </Text>
        )}
      </Stack>

      <Space my={"md"} />

      <div className={styles.proseBody}>
        <Text size="sm" style={{ lineHeight: 1.7 }}>
          {glimpseResult.summary || ""}
          {loading && !glimpseResult.summaryComplete && (
            <span className={styles.streamingCursor}>▌</span>
          )}
        </Text>
      </div>
      {includeNavigationPrompt && (
        <Group justify="flex-start" my="sm">
          <Link
            to={`/spyglass?q=${encodeURIComponent(query)}&deep=true`}
            style={{ textDecoration: "none" }}
          >
            <PaperButton
              withBorder
              leftSection={<SpyglassIcon size={12} />}
              size="sm"
            >
              Deep Focus
            </PaperButton>
          </Link>
        </Group>
      )}

      {glimpseResult.entryPoint && entryPointResource && (
        <div id="glimpse-entry-point" className={styles.entryPointSection}>
          <Group gap="xs" mb="sm">
            <CompassIcon size={16} />
            <Text size="sm" fw={500} c="dimmed">
              Start Here
            </Text>
          </Group>
          {view === "compact" ? (
            <PaperThing
              id={entryPointResource.id.toString()}
              title={glimpseResult.entryPoint.title}
              detail={glimpseResult.entryPoint.reason}
              icon={TypeIcon(
                getTypeFromId(
                  entryPointResource.id.toString(),
                ) as INode["type"],
              )}
              onClick={(id, e) => {
                if (onResultClick) {
                  e.stopPropagation();
                  onResultClick(entryPointResource as unknown as INode);
                } else {
                  navigate(
                    `/${entryPointResource.type}/${entryPointResource.id.toString()}`,
                  );
                }
              }}
              preventClickDefault={!!onResultClick}
              preview={resultsMap[glimpseResult.entryPoint.resourceId].content}
            />
          ) : (
            <GridCard
              id={entryPointResource.id.toString()}
              title={glimpseResult.entryPoint.title}
              detail={glimpseResult.entryPoint.reason}
              icon={TypeIcon(
                getTypeFromId(
                  entryPointResource.id.toString(),
                ) as INode["type"],
              )}
              onClick={(id, e) => {
                if (onResultClick) {
                  e.stopPropagation();
                  onResultClick(entryPointResource as unknown as INode);
                } else {
                  navigate(
                    `/${entryPointResource.type}/${entryPointResource.id.toString()}`,
                  );
                }
              }}
              preventClickDefault={!!onResultClick}
              state="default"
              preview={resultsMap[glimpseResult.entryPoint.resourceId].content}
            />
          )}
        </div>
      )}

      {(glimpseResult.contentMap || []).map((set, setIndex) => {
        const sectionThings: IThing[] = set.results
          .filter((result) => result.resourceId !== entryPointId)
          .map((result) => {
            const resource = resultsMap[result.resourceId];
            if (!resource) return null;

            const type = getTypeFromId(result.resourceId);
            const Icon = TypeIcon(type as INode["type"]);

            const relationshipLabel = getRelationshipLabel(result.relationship);
            const detailText = relationshipLabel
              ? `${relationshipLabel} • ${result.explanation}`
              : result.explanation;

            return {
              id: result.resourceId,
              title: result.title,
              detail: detailText,
              icon: Icon,
              link: `/${resource.type}/${resource.id.toString()}`,
              draggable: false,
              onClick: (id: string, e: React.MouseEvent) => {
                if (onResultClick) {
                  e.stopPropagation();
                  e.preventDefault();
                  onResultClick(resource as unknown as INode);
                }
              },
              preventClickDefault: !!onResultClick,
              preview: resultsMap[resource.id.toString()].content,
            } as IThing;
          })
          .filter((thing): thing is IThing => thing !== null);

        if (sectionThings.length === 0) return null;

        const SectionIcon = getSectionIcon(set.sectionType);
        const sectionTypeLabel = getSectionTypeLabel(set.sectionType);
        const sectionTypeColor = getSectionTypeColor(set.sectionType);

        return (
          <div
            key={setIndex}
            id={`glimpse-section-${setIndex}`}
            className={styles.contentSection}
          >
            <Group gap="xs" mb="xs">
              <Text size="sm" fw={500}>
                {set.title}
                {SectionIcon && (
                  <SectionIcon
                    size={12}
                    weight="bold"
                    style={{
                      marginLeft: "4px",
                    }}
                  />
                )}
              </Text>
              {sectionTypeLabel && view === "full" && (
                <Badge
                  size="xs"
                  variant="light"
                  color={sectionTypeColor}
                  styles={{ label: { textTransform: "none" } }}
                >
                  {sectionTypeLabel}
                </Badge>
              )}
            </Group>
            {set.description && view === "full" && (
              <Text size="xs" c="dimmed" mb="md">
                {set.description}
              </Text>
            )}
            <div
              className={
                view === "compact" ? styles.sectionList : styles.sectionGrid
              }
            >
              {sectionThings.map((thing, index) => (
                <div
                  key={thing.id}
                  className={styles.gridItem}
                  style={{ animationDelay: `${Math.log(index + 1) * 75}ms` }}
                >
                  {view === "compact" ? (
                    <PaperThing {...thing} />
                  ) : (
                    <GridCard {...thing} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {view === "full" &&
        glimpseResult.connections &&
        glimpseResult.connections.length > 0 && (
          <div id="glimpse-connections" className={styles.connectionsSection}>
            <Text size="sm" fw={500} c="dimmed" mb="sm">
              Connections
            </Text>
            <div className={styles.connectionsList}>
              {glimpseResult.connections.map((connection, index) => (
                <div key={index} className={styles.connectionItem}>
                  <Text size="xs">{connection.theme}</Text>
                  <Group gap={4} mt={4}>
                    {connection.resourceIds.map((id) => {
                      const resource = resultsMap[id];
                      if (!resource) return null;
                      return (
                        <Badge
                          key={id}
                          size="xs"
                          variant="light"
                          color="gray"
                          style={{ cursor: "pointer" }}
                          styles={{ label: { textTransform: "none" } }}
                          onClick={(e) => {
                            if (onResultClick) {
                              e.stopPropagation();
                              onResultClick(resource as unknown as INode);
                            } else {
                              navigate(
                                `/${resource.type}/${resource.id.toString()}`,
                              );
                            }
                          }}
                        >
                          {resource.name}
                        </Badge>
                      );
                    })}
                  </Group>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

export default GlimpseModeDisplay;
