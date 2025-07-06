import React, { useState } from "react";
import { Badge, Blockquote, Group, HoverCard, Text } from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import {
  ICitationMap,
  IResultsMap,
} from "../../../pages/Spyglass/hooks/useSpyglass";
import styles from "./OverviewParser.module.scss";
import { ArrowRightIcon } from "@phosphor-icons/react";
import parse, {
  HTMLReactParserOptions,
  Text as ReactParserText,
  Element as ReactParserElement,
  domToReact,
  DOMNode,
} from "html-react-parser";
import { getNodeTitle } from "../../../utils/graph";
import { Link } from "react-router";
import { markdownToHtml } from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { hasVisibleChildren } from "../../../utils/helpers";

interface IOverviewParserProps {
  html: string;
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

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget;

    if (target.closest(`.${styles.findingNumber}`) === currentTarget) {
      setHoveringCitation(true);
    }
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
        <Group gap="xs">
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
  html,
  citationMap,
  resultsMap,
  analysis,
}) => {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof ReactParserText) {
        if (domNode.data.trim().length === 0) {
          return <>{domNode.data}</>;
        }

        const wordsAndSpaces = domNode.data.split(/(\s+)/);

        return (
          <>
            {wordsAndSpaces.map((chunk, index) =>
              chunk.trim().length > 0 ? (
                <span key={index} className={styles.word}>
                  {chunk}
                </span>
              ) : (
                <React.Fragment key={index}>{chunk}</React.Fragment>
              ),
            )}
          </>
        );
      }
      if (domNode instanceof ReactParserElement) {
        if (
          domNode.name === "span" &&
          domNode.attribs &&
          domNode.attribs["data-finding-number"]
        ) {
          const findingNumberAttr = domNode.attribs["data-finding-number"];
          let findingNumbers: number[] = [];
          try {
            const parsedData = JSON.parse(findingNumberAttr);
            findingNumbers = Array.isArray(parsedData)
              ? parsedData
              : [parsedData];
          } catch (error) {
            const num = parseInt(findingNumberAttr, 10);
            if (!isNaN(num)) {
              findingNumbers = [num];
            } else {
              console.warn(
                `Could not parse finding number(s): "${findingNumberAttr}"`,
              );
            }
          }

          if (findingNumbers.length > 0) {
            return (
              <FindingNumbersSpan
                findingNumbers={findingNumbers}
                citationMap={citationMap}
                resultsMap={resultsMap}
                analysis={analysis}
              >
                {domToReact(domNode.children as DOMNode[], options)}
              </FindingNumbersSpan>
            );
          }
        }
      }
    },
  };

  return <div className={styles.overviewText}>{parse(html, options)}</div>;
};

export default OverviewParser;
