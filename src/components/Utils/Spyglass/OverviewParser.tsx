import React, { useState } from "react";
import { Badge, Blockquote, Group, HoverCard, Text } from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import {
  ICitationMap,
  IResultsMap,
} from "../../../pages/Spyglass/hooks/useSpyglass";
import styles from "./OverviewParser.module.scss";
import { ArrowRightIcon } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { getNodeTitle } from "../../../utils/graph";
import { Link } from "react-router";
import { markdownToHtml } from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { hasVisibleChildren } from "../../../utils/helpers";

interface IOverviewParserProps {
  markdown: string;
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
}

interface IFindingBadgeProps {
  findingNumber: number;
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
  hovering?: boolean;
}

const FindingBadge: React.FC<IFindingBadgeProps> = ({
  findingNumber,
  citationMap,
  resultsMap,
  analysis,
  hovering,
}) => {
  const fn = findingNumber;
  const finding = analysis?.findings[fn];

  if (!finding) {
    return null;
  }

  const result = resultsMap[finding.sourceId];
  if (!result) {
    console.warn(`Could not find result for source ID: ${finding.sourceId}`);
    return null;
  }

  const title = getNodeTitle(result);
  const titleLink = (sourceId: string, excerpt?: string) => {
    if (!excerpt) {
      return `/idea/${sourceId}`;
    } else {
      return `/idea/${sourceId}?highlightText=${generateTextFragmentHashFromText(excerpt)}`;
    }
  };

  return (
    <HoverCard
      width="400px"
      position="bottom-end"
      withArrow
      shadow="lg"
      openDelay={500}
      styles={{
        dropdown: {
          maxHeight: "calc(50vh - 200px)",
          overflowY: "scroll",
        },
      }}
      radius="lg"
    >
      <HoverCard.Target>
        <Badge
          variant="light"
          size="sm"
          mx="2px"
          p="xs"
          radius="lg"
          color="gray"
          classNames={{
            root: `${styles.citationIcon} ${hovering ? styles.hovering : ""}`,
          }}
        >
          {fn + 1}
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Group align="baseline" justify="space-between">
          <Link
            to={titleLink(finding.sourceId.toString(), finding.excerpt)}
            style={{
              textDecoration: "none",
            }}
          >
            <Text
              size="md"
              c="dark.1"
              fw="bold"
              style={{
                cursor: "pointer",
              }}
            >
              <Group gap="xs">
                {title}
                <ArrowRightIcon weight="bold" />
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
        <Text>{finding.analysis}</Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

interface IFindingNumbersSpanProps {
  findingNumbers: number[];
  children: React.ReactNode;
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
}

const FindingNumbersSpan: React.FC<IFindingNumbersSpanProps> = ({
  findingNumbers,
  children,
  citationMap,
  resultsMap,
  analysis,
}) => {
  const [hoveringCitation, setHoveringCitation] = useState(false);

  const handleMouseEnter = () => {
    setHoveringCitation(true);
  };

  const handleMouseLeave = () => {
    setHoveringCitation(false);
  };

  const hasChildren = hasVisibleChildren(children);

  if (findingNumbers.length === 0) {
    return <>{children}</>;
  }

  return (
    <span
      className={`${styles.findingNumber} ${hoveringCitation ? styles.hovering : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasChildren && (
        <span
          className={`${styles.content} ${hoveringCitation ? styles.hovering : ""}`}
        >
          {children}
        </span>
      )}
      <span className={`${styles.number}`}>
        <Group gap="xs" wrap="wrap">
          {findingNumbers.map((fn) => (
            <FindingBadge
              key={fn}
              findingNumber={fn}
              citationMap={citationMap}
              resultsMap={resultsMap}
              analysis={analysis}
              hovering={hoveringCitation}
            />
          ))}
        </Group>
      </span>
    </span>
  );
};

const OverviewParser: React.FC<IOverviewParserProps> = ({
  markdown,
  citationMap,
  resultsMap,
  analysis,
}) => {
  console.log("Recieved markdown: ", markdown);
  const urlTransform = (url: string) => {
    const supportedProtocols = [
      "http:",
      "https:",
      "ftp:",
      "mailto:",
      "finding:",
    ];
    if (!supportedProtocols.some((protocol) => url.startsWith(protocol))) {
      return "";
    }
    return url;
  };

  return (
    <div className={styles.overviewText}>
      <ReactMarkdown
        urlTransform={urlTransform}
        components={{
          a: ({ node, ...props }) => {
            console.log("Got a link node: ", node, props);
            if (props.href?.startsWith("finding:")) {
              const findingNumberStr = props.href.substring(8);
              const findingNumbers = findingNumberStr
                .split(",")
                .map((s) => parseInt(s.trim(), 10) - 1) // Convert from 1-based to 0-based
                .filter((n) => !isNaN(n));

              if (findingNumbers.length > 0) {
                return (
                  <FindingNumbersSpan
                    findingNumbers={findingNumbers}
                    citationMap={citationMap}
                    resultsMap={resultsMap}
                    analysis={analysis}
                  >
                    {props.children}
                  </FindingNumbersSpan>
                );
              }
            }
            // Render regular links as standard anchor tags
            return (
              <a href={props.href} target="_blank" rel="noopener noreferrer">
                {props.children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default OverviewParser;
