import { Link, useNavigate } from "react-router";
import {
  ISpyglassSearch,
  ISearchOverview,
} from "../../../../app/database/models/search";
import {
  ICitationMap,
  IResultsMap,
} from "../../../pages/Spyglass/hooks/useSpyglass";
import { useCallback, useState } from "react";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { useLayout } from "../../../contexts/LayoutContext";
import OverviewParser from "./OverviewParser";
import {
  Accordion,
  ActionIcon,
  Badge,
  Blockquote,
  Box,
  Button,
  CopyButton,
  Group,
  HoverCard,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import styles from "./Overview.module.scss";
import {
  ArrowLineLeftIcon,
  ArrowLineUpRightIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { markdownToHtml } from "../../../utils/formatting";
import { IFinding } from "../../../../app/services/Spyglass";
import { getNodeTitle, getTypeFromId } from "../../../utils/graph";
import { INode } from "../../../declarations/graph";

export type IDisplayOverview = {
  overview: ISearchOverview;
  resultsMap: IResultsMap;
  citationMap: ICitationMap;
  query: string;
  results: ISpyglassSearch["fullResults"];
  loading: boolean;
};

export function DisplayOverview({
  overview,
  resultsMap,
  citationMap,
  query,
  results,
  loading,
}: IDisplayOverview) {
  const navigate = useNavigate();

  // Helper function to navigate with text fragment
  const navigateWithTextFragment = useCallback(
    (ideaId: string, excerpt?: string) => {
      if (!excerpt) {
        let url = `/idea/${ideaId}`;
        navigate(url);
      } else {
        let url = `/idea/${ideaId}?highlightText=${generateTextFragmentHashFromText(excerpt)}`;
        navigate(url);
      }
    },
    [navigate],
  );

  const [showFindings, setShowFindings] = useState(false);

  const {
    elements: {
      rightSidebar: {
        mode: { toggle: toggleRightSidebar, get: rightSidebarMode },
      },
    },
  } = useLayout();

  const findingsBySource = overview.findings.reduce(
    (acc, current, findingNumber) => {
      if (acc.has(current.sourceId)) {
        acc.get(current.sourceId)?.push({
          ...current,
          index: findingNumber,
        });
      } else {
        acc.set(current.sourceId, [{ ...current, index: findingNumber }]);
      }
      return acc;
    },
    new Map<string, (IFinding & { index: number })[]>([]),
  );

  return (
    <div>
      <Group justify="space-between" className={styles.overviewUI}>
        <Group>
          <Button
            rightSection={
              !showFindings ? (
                <CaretDownIcon weight="bold" />
              ) : (
                <CaretUpIcon weight="bold" />
              )
            }
            onClick={() => setShowFindings(!showFindings)}
            variant="default"
            radius="lg"
            size="xs"
          >
            {overview.findings.length} Finding
            {overview.findings.length === 1 ? "" : "s"}
          </Button>
          <Button
            radius="lg"
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={
              rightSidebarMode === "collapsed" ? (
                <ArrowLineUpRightIcon weight="bold" />
              ) : (
                <ArrowLineLeftIcon weight="bold" />
              )
            }
            onClick={() => {
              toggleRightSidebar();
            }}
          >
            {results?.length} Result{results?.length === 1 ? "" : "s"}
          </Button>
        </Group>
        <Group justify="end">
          {!loading && (
            <Group>
              <HoverCard position="bottom-end" withArrow>
                <HoverCard.Target>
                  <ActionIcon variant="light" size="sm" color="gray">
                    <CopyIcon size="14px" />
                  </ActionIcon>
                </HoverCard.Target>
                <HoverCard.Dropdown p="0">
                  <Stack gap="0">
                    <CopyButton value={markdownToHtml(overview.overview)}>
                      {({ copied, copy }) => {
                        return (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={copy}
                            leftSection={!copied ? <CopyIcon /> : <CheckIcon />}
                          >
                            Copy as HTML
                          </Button>
                        );
                      }}
                    </CopyButton>
                    <CopyButton value={overview.overview}>
                      {({ copied, copy }) => {
                        return (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={copy}
                            leftSection={!copied ? <CopyIcon /> : <CheckIcon />}
                          >
                            Copy as Markdown
                          </Button>
                        );
                      }}
                    </CopyButton>
                  </Stack>
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
          )}
        </Group>
      </Group>
      {showFindings && (
        <>
          <Space my="sm" />
          <Accordion radius="lg" variant="contained">
            {Array.from(findingsBySource.entries())
              .filter(([sourceId]) => {
                return sourceId in resultsMap;
              })
              .map(([sourceId, findings], index) => {
                const nodeType = getTypeFromId(sourceId) as
                  | "source"
                  | "idea"
                  | "excerpt"
                  | "task";
                const source = { ...resultsMap[sourceId], type: nodeType };

                if (!nodeType) {
                  return null;
                }

                const title = getNodeTitle({
                  ...(source as INode),
                });

                return (
                  <Accordion.Item key={sourceId} value={sourceId}>
                    <Accordion.Control>
                      <Group align="center" justify="space-between">
                        <Text size="sm">{title}</Text>
                        <Group gap="2px">
                          {findings.map((finding) => {
                            return (
                              <button
                                key={finding.index}
                                className={styles.citationIcon}
                              >
                                {finding.index + 1}
                              </button>
                            );
                          })}
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack>
                        <Text>
                          <Link
                            to={`/idea/${sourceId}`}
                            target="_blank"
                            style={{
                              textDecoration: "none",
                            }}
                          >
                            <Group gap="xs" c="dimmed">
                              <Text size="sm">View</Text>
                              <ArrowRightIcon size={14} />
                            </Group>
                          </Link>
                        </Text>
                        {findings.map((finding) => {
                          return (
                            <Box mb="sm">
                              <Blockquote color="gray" p="xs" mb="xs">
                                <Badge
                                  key={finding.index}
                                  variant="light"
                                  size="sm"
                                  mx="2px"
                                  p="xs"
                                  radius="lg"
                                  color="gray"
                                >
                                  <Text size="xs" fw="bold">
                                    {finding.index + 1}
                                  </Text>
                                </Badge>
                                <Text
                                  size="sm"
                                  p="0"
                                  dangerouslySetInnerHTML={{
                                    __html: markdownToHtml(finding.excerpt),
                                  }}
                                />
                              </Blockquote>
                              <Text>{finding.analysis}</Text>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
          </Accordion>
        </>
      )}
      <OverviewParser
        markdown={overview.overview}
        resultsMap={resultsMap}
        analysis={overview}
      />
      <Space my="lg" />
    </div>
  );
}
