import React from "react";
import { Badge, Blockquote, Group, HoverCard, Text } from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import { IResultsMap } from "../../../pages/Spyglass/hooks/useSpyglass";
import styles from "./OverviewParser.module.scss";
import { ArrowRightIcon } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Import the plugin
import { getNodeLink, getNodeTitle } from "../../../utils/graph";
import { Link } from "react-router";
import { markdownToHtml } from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";

interface IOverviewParserProps {
  markdown: string;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
}

interface IFindingBadgeProps {
  findingNumber: number;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
}

const FindingBadge: React.FC<IFindingBadgeProps> = ({
  findingNumber,
  resultsMap,
  analysis,
}) => {
  const finding = analysis?.findings[findingNumber];
  if (!finding) return null;

  const result = resultsMap[finding.sourceId];
  if (!result) return null;

  const title = getNodeTitle(result);
  const titleLink = getNodeLink(result);

  return (
    <HoverCard
      width="400px"
      position="bottom-end"
      withArrow
      shadow="lg"
      openDelay={500}
      radius="lg"
    >
      <HoverCard.Target>
        <button className={styles.citationIcon}>{findingNumber + 1}</button>
      </HoverCard.Target>
      <HoverCard.Dropdown
        mah={400}
        style={{
          overflowY: "auto",
        }}
      >
        <Group align="baseline" justify="space-between">
          <Link to={titleLink || ""} style={{ textDecoration: "none" }}>
            <Text size="md" c="dark.1" fw="bold" style={{ cursor: "pointer" }}>
              <Group gap="xs">
                {title}
                {titleLink && <ArrowRightIcon weight="bold" />}
              </Group>
            </Text>
          </Link>
          <Badge variant="light" mb="sm" color="gray">
            {finding.findingType.replaceAll(/_/g, " ")}
          </Badge>
        </Group>
        <Blockquote color="gray" p="xs" mb="sm">
          <Text
            size="sm"
            p="0"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(finding.excerpt),
            }}
          />
        </Blockquote>
        <Text size="sm">{finding.analysis}</Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

const OverviewParser: React.FC<IOverviewParserProps> = ({
  markdown,
  resultsMap,
  analysis,
}) => {
  const processedMarkdown = React.useMemo(() => {
    if (!markdown) return "";
    const citationRegex = /\[(\d+)\]/g;
    return markdown.replace(citationRegex, (match, numberStr) => {
      return `[](source:${numberStr})`;
    });
  }, [markdown]);

  const urlTransform = (url: string) => {
    const supportedProtocols = [
      "http:",
      "https:",
      "ftp:",
      "mailto:",
      "source:",
    ];
    if (supportedProtocols.some((protocol) => url.startsWith(protocol))) {
      return url;
    }
    return "";
  };

  return (
    <div className={styles.overviewText}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Add the plugin here
        urlTransform={urlTransform}
        components={{
          a: ({ node, ...props }) => {
            if (props.href?.startsWith("source:")) {
              const findingNumberStr = props.href.substring(7);
              const findingNumber = parseInt(findingNumberStr.trim(), 10);

              if (!isNaN(findingNumber)) {
                return (
                  <FindingBadge
                    findingNumber={findingNumber - 1}
                    resultsMap={resultsMap}
                    analysis={analysis}
                  />
                );
              }
            }
            return (
              <a href={props.href} target="_blank" rel="noopener noreferrer">
                {props.children}
              </a>
            );
          },
        }}
      >
        {processedMarkdown}
      </ReactMarkdown>
    </div>
  );
};

export default OverviewParser;
