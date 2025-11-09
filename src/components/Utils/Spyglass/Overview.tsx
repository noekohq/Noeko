import { Link, useNavigate } from "react-router";
import { memo, useCallback, useState } from "react";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { useLayout } from "../../../contexts/LayoutContext";
import OverviewParser from "./OverviewParser";
import {
  Accordion,
  ActionIcon,
  Badge,
  Blockquote,
  Box,
  CopyButton,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import styles from "./Overview.module.scss";
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { markdownToHtml } from "../../../utils/formatting";
import { IFinding } from "../../../../app/services/Spyglass";
import { getNodeTitle, getTypeFromId } from "../../../utils/graph";
import { INode } from "../../../declarations/graph";
import { getOverviewAsMarkdown } from "../../../utils/spyglass";
import { downloadTextAsFile } from "../../../utils/files";
import {
  IConnectable,
  IConnectableFields,
} from "../../../../app/services/Graph";
import { Tabs } from "../../UI/Layout/Utils/Tabs";
import { ICitationMap, IResultsMap } from "../../../hooks/useSpyglassService";
import { Pillbar } from "../../UI/Layout/Utils/Pillbar";

export type IDisplayOverview = {
  overview: string;
  findings: IFinding[];
  resultsMap: IResultsMap;
  citationMap: ICitationMap;
  query: string;
  results: IConnectableFields[];
  loading: boolean;
};

export function DisplayOverviewComponent({
  overview,
  findings,
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

  const findingsBySource = findings.reduce((acc, current, findingNumber) => {
    if (acc.has(current.sourceId)) {
      acc.get(current.sourceId)?.push({
        ...current,
        index: findingNumber,
      });
    } else {
      acc.set(current.sourceId, [{ ...current, index: findingNumber }]);
    }
    return acc;
  }, new Map<string, (IFinding & { index: number })[]>([]));

  const handleDownloadAsMarkdown = () => {
    const content = getOverviewAsMarkdown(overview, findings, resultsMap);
    return downloadTextAsFile(content, {
      type: "text/markdown",
      extension: "md",
      name: `${query}`,
    });
  };

  return (
    <div>
      <Pillbar defaultValue="overview">
        <Pillbar.List>
          <Pillbar.Tab value="overview" leftSection={<TextAlignLeftIcon />}>
            Overview
          </Pillbar.Tab>
          <Pillbar.Tab value="findings" leftSection={<MagnifyingGlassIcon />}>
            Findings
          </Pillbar.Tab>
        </Pillbar.List>
        <Pillbar.Panel value="overview">
          <Group justify="space-between" className={styles.overviewUI}>
            <Group justify="end">
              {!loading && (
                <Group>
                  <ActionIcon
                    variant="light"
                    size="md"
                    radius="md"
                    color="gray"
                    onClick={() => {
                      handleDownloadAsMarkdown();
                    }}
                    aria-label="Download as markdown"
                  >
                    <DownloadSimpleIcon />
                  </ActionIcon>
                  <CopyButton
                    value={getOverviewAsMarkdown(
                      overview,
                      findings,
                      resultsMap,
                    )}
                  >
                    {({ copied, copy }) => {
                      return (
                        <ActionIcon
                          variant="light"
                          size="md"
                          radius="md"
                          color="gray"
                          onClick={copy}
                          aria-label="Copy as markdown"
                        >
                          {!copied ? <CopyIcon /> : <CheckIcon />}
                        </ActionIcon>
                      );
                    }}
                  </CopyButton>
                </Group>
              )}
            </Group>
          </Group>
          <OverviewParser
            markdown={overview}
            resultsMap={resultsMap}
            findings={findings}
          />
        </Pillbar.Panel>
        <Pillbar.Panel value="findings">
          {!findings.length && (
            <Text c="dimmed" size="sm">
              No findings for this query.
            </Text>
          )}
          <Accordion radius="lg" variant="contained">
            {Array.from(findingsBySource.entries())
              .filter(([sourceId]) => {
                return sourceId in resultsMap;
              })
              .map(([sourceId, findings], index) => {
                const resource = resultsMap[sourceId];
                const title = resource.name;

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
                              <Group gap="xs" align="center" mb="xs">
                                <Badge
                                  key={finding.index}
                                  variant="light"
                                  size="xs"
                                  mx="2px"
                                  p="xs"
                                  radius="sm"
                                  color="blue"
                                >
                                  <Text size="xs" fw="bold">
                                    {finding.index + 1}
                                  </Text>
                                </Badge>
                                <Badge
                                  key={finding.findingType}
                                  variant="light"
                                  size="xs"
                                  mx="2px"
                                  p="xs"
                                  radius="lg"
                                  color="gray"
                                >
                                  {finding.findingType}
                                </Badge>
                              </Group>
                              <Blockquote color="gray" p="xs" mb="xs">
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
        </Pillbar.Panel>
      </Pillbar>
    </div>
  );
}

const areEqual = (prevProps: IDisplayOverview, nextProps: IDisplayOverview) => {
  /*
   * This function returns true if the props are "equal," preventing a re-render.
   * We compare all props EXCEPT for `query`.
   */
  return (
    prevProps.overview === nextProps.overview &&
    prevProps.resultsMap === nextProps.resultsMap &&
    prevProps.citationMap === nextProps.citationMap &&
    prevProps.results === nextProps.results &&
    prevProps.loading === nextProps.loading
  );
};

export const DisplayOverview = memo(DisplayOverviewComponent, areEqual);
