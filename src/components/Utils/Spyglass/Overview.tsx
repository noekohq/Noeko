import { useNavigate } from "react-router";
import { memo, useCallback, useMemo } from "react";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import OverviewParser from "./OverviewParser";
import {
  ActionIcon,
  CopyButton,
  Group,
  Text,
  Title,
} from "@mantine/core";
import styles from "./Overview.module.scss";
import {
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { IFinding } from "../../../../app/services/Spyglass";
import { getOverviewAsMarkdown } from "../../../utils/spyglass";
import { downloadTextAsFile } from "../../../utils/files";
import { IConnectableFields } from "../../../../app/services/Graph";
import { ICitationMap, IResultsMap } from "../../../hooks/useSpyglassService";
import FindingGroupCard from "./FindingGroupCard";

export type IDisplayOverview = {
  overview: string;
  findings: IFinding[];
  resultsMap: IResultsMap;
  citationMap: ICitationMap;
  query: string;
  results: IConnectableFields[];
  loading?: boolean;
};

export function DisplayOverviewComponent({
  overview,
  findings,
  resultsMap,
  citationMap,
  query,
  results,
  loading = false,
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

  const handleDownloadAsMarkdown = () => {
    const content = getOverviewAsMarkdown(overview, findings, resultsMap);
    return downloadTextAsFile(content, {
      type: "text/markdown",
      extension: "md",
      name: `${query}`,
    });
  };

  const sourceCount = Object.keys(resultsMap).length;

  // Group findings by sourceId to avoid duplicate cards
  const groupedFindings = useMemo(() => {
    const groups = new Map<
      string,
      { sourceId: string; resource: IConnectableFields; findings: IFinding[] }
    >();

    for (const finding of findings) {
      const resource = resultsMap[finding.sourceId];
      if (!resource) continue;

      const existing = groups.get(finding.sourceId);
      if (existing) {
        existing.findings.push(finding);
      } else {
        groups.set(finding.sourceId, {
          sourceId: finding.sourceId,
          resource,
          findings: [finding],
        });
      }
    }

    return Array.from(groups.values());
  }, [findings, resultsMap]);

  return (
    <div className={styles.editorialWrapper}>
      {/* Editorial Header: Query as H1 */}
      <Title order={1} className={`${styles.queryTitle} ${loading ? styles.loading : ''}`}>
        {query}
      </Title>

      {/* Metadata Byline */}
      <Text size="xs" c="dimmed" className={styles.byline}>
        {sourceCount > 0 && (
          <span>
            Reading {sourceCount} source{sourceCount !== 1 ? "s" : ""}
          </span>
        )}
        {sourceCount > 0 && findings.length > 0 && (
          <span className={styles.bylineDot}> • </span>
        )}
        {findings.length > 0 && (
          <span>
            {findings.length} finding{findings.length !== 1 ? "s" : ""}
          </span>
        )}
      </Text>

      {/* Clean Prose Body */}
      <div id="deep-focus-summary" className={styles.proseBody}>
        <OverviewParser
          markdown={overview}
          resultsMap={resultsMap}
          findings={findings}
          loading={loading}
        />
      </div>

      {/* Actions Row - After prose */}
      {!loading && overview && (
        <Group gap="xs" className={styles.actionsRow}>
          <ActionIcon
            variant="subtle"
            size="sm"
            radius="md"
            color="gray"
            onClick={() => {
              handleDownloadAsMarkdown();
            }}
            aria-label="Download as markdown"
          >
            <DownloadSimpleIcon size={14} />
          </ActionIcon>
          <CopyButton
            value={getOverviewAsMarkdown(overview, findings, resultsMap)}
          >
            {({ copied, copy }) => {
              return (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  radius="md"
                  color="gray"
                  onClick={copy}
                  aria-label="Copy as markdown"
                >
                  {!copied ? <CopyIcon size={14} /> : <CheckIcon size={14} />}
                </ActionIcon>
              );
            }}
          </CopyButton>
        </Group>
      )}

      {/* Key Findings - Bottom Grid using FindingGroupCard */}
      {groupedFindings.length > 0 && !loading && (
        <div id="deep-focus-findings" className={styles.findingsSection}>
          <Text size="sm" fw={500} c="dimmed" mb="md">
            Key Findings
          </Text>
          <div className={styles.findingsGrid}>
            {groupedFindings.map((group, index) => (
              <div
                key={group.sourceId}
                id={`finding-${group.sourceId}`}
                className={styles.findingGridItem}
                style={{ animationDelay: `${Math.log(index + 1) * 75}ms` }}
              >
                <FindingGroupCard group={group} />
              </div>
            ))}
          </div>
        </div>
      )}
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
