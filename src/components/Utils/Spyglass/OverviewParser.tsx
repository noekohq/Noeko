import React, { useCallback, useState } from "react";
import {
  ActionIcon,
  Badge,
  Blockquote,
  Group,
  HoverCard,
  Text,
} from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import {
  ICitationMap,
  IResultsMap,
} from "../../../pages/Spyglass/hooks/useSpyglass";
import styles from "./OverviewParser.module.scss";
import { ArrowRightIcon, QuotesIcon } from "@phosphor-icons/react";
import parse, {
  HTMLReactParserOptions,
  Text as ReactParserText,
  Element as ReactParserElement,
  domToReact,
  DOMNode,
} from "html-react-parser";
import { getNodeTitle } from "../../../utils/graph";
import { Link, useNavigate } from "react-router";
import { markdownToHtml } from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { hasVisibleChildren } from "../../../utils/helpers";

interface IOverviewParserProps {
  html: string;
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
}

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
          // It's a match! Replace it with our custom component.
          return (
            <FindingNumberSpan
              findingNumber={domNode.attribs["data-finding-number"]}
              citationMap={citationMap}
              resultsMap={resultsMap}
              analysis={analysis}
            >
              {/* It's important to parse the children so their text also gets wrapped in words */}
              {domToReact(domNode.children as DOMNode[], options)}
            </FindingNumberSpan>
          );
        }
      }
    },
  };

  return <div className={styles.overviewText}>{parse(html, options)}</div>;
};

export default OverviewParser;

interface IFindingNumberSpanProps {
  findingNumber: string;
  children: React.ReactNode;
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  analysis: ISpyglassSearch["analysis"];
}

// Your custom component that you can style and tune
const FindingNumberSpan: React.FC<IFindingNumberSpanProps> = ({
  findingNumber,
  children,
  citationMap,
  resultsMap,
  analysis,
}) => {
  const [hoveringCitation, setHoveringCitation] = useState(false);
  console.log("Hovering citation: ", hoveringCitation);
  const fn = Number(findingNumber);
  const finding = analysis?.findings[fn];

  const navigate = useNavigate();

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

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget;

    // Only set hover(true) if the element this handler is attached to
    // is the closest ancestor with the .findingNumber class. This ensures
    // that for nested elements, only the innermost one gets highlighted.
    if (target.closest(`.${styles.findingNumber}`) === currentTarget) {
      setHoveringCitation(true);
    }
  };

  const handleMouseLeave = () => {
    // onMouseLeave fires when the cursor leaves the element's bounds,
    // which is exactly what we want.
    setHoveringCitation(false);
  };

  const hasChildren = hasVisibleChildren(children);

  if (!finding) {
    return children;
  }

  const result = resultsMap[finding.sourceId];
  const citation = citationMap[finding.sourceId];

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
          maxHeight: "calc(80vh - 200px)",
          overflow: "auto",
          overflowX: "hidden",
        },
      }}
      radius="lg"
    >
      <HoverCard.Target>
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
            <Badge
              variant="light"
              size="sm"
              mx="2px"
              p="xs"
              radius="lg"
              color="gray"
              classNames={{
                root: `${styles.citationIcon} ${hoveringCitation ? styles.hovering : ""}`,
              }}
            >
              {fn + 1}
            </Badge>
          </span>
        </span>
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
