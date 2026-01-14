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
  Title,
  Button,
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
    <div className={styles.guidedSurveyWrapper}>
      <Group justify="space-between" mb="lg">
        <Title order={4}>Guided Survey</Title>
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
              value={getOverviewAsMarkdown(overview, findings, resultsMap)}
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

      <Stack gap="xl">
        <div className={styles.overviewSection}>
          <OverviewParser
            markdown={overview}
            resultsMap={resultsMap}
            findings={findings}
          />
        </div>

        {findings.length > 0 && (
          <div className={styles.findingsSection}>
            <Title order={5} mb="md" c="dimmed">
              Key Findings
            </Title>
            <Stack gap="lg">
              {findings.map((finding, index) => {
                const resource = resultsMap[finding.sourceId];
                if (!resource) return null;

                return (
                  <div key={index} className={styles.findingBlock}>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Badge
                          variant="filled"
                          size="sm"
                          color="blue"
                          radius="sm"
                        >
                          {index + 1}
                        </Badge>
                        <Text size="sm" fw="bold">
                          {resource.name}
                        </Text>
                      </Group>
                      <Badge variant="light" size="xs" color="gray">
                        {finding.findingType.replaceAll("_", " ")}
                      </Badge>
                    </Group>

                    <Blockquote
                      color="blue"
                      p="md"
                      radius="md"
                      mb="sm"
                      className={styles.findingExcerpt}
                    >
                      <Text
                        size="sm"
                        dangerouslySetInnerHTML={{
                          __html: markdownToHtml(finding.excerpt),
                        }}
                      />
                    </Blockquote>

                    <Text size="sm" className={styles.findingAnalysis}>
                      {finding.analysis}
                    </Text>

                    <Group justify="flex-end" mt="xs">
                      <Link
                        to={`/${resource.type}/${resource.id.toString()}`}
                        style={{ textDecoration: "none" }}
                      >
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          rightSection={<ArrowRightIcon size={12} />}
                        >
                          View Source
                        </Button>
                      </Link>
                    </Group>
                  </div>
                );
              })}
            </Stack>
          </div>
        )}
      </Stack>
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
