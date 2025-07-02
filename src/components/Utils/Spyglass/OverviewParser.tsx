import React, { useCallback } from "react";
import { ActionIcon, Badge, Blockquote, HoverCard, Text } from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import {
  ICitationMap,
  IResultsMap,
} from "../../../pages/Spyglass/hooks/useSpyglass";
import styles from "./OverviewParser.module.scss";
import { QuotesIcon } from "@phosphor-icons/react";
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

  if (!finding) {
    return children;
  }

  const result = resultsMap[finding.sourceId];
  const citation = citationMap[finding.sourceId];

  const title = getNodeTitle(result);

  return (
    <span className={styles.findingNumber}>
      {children}
      {finding && (
        <HoverCard
          width="400px"
          withArrow
          shadow="lg"
          openDelay={500}
          styles={{
            dropdown: {
              maxHeight: "calc(50vh - 200px)",
              overflow: "auto",
              overflowX: "hidden",
            },
          }}
        >
          <HoverCard.Target>
            <ActionIcon variant="light" size="xs" mx="2px">
              <Text size="xs">{fn + 1}</Text>
            </ActionIcon>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Badge variant="light" mb="sm">
              {finding.findingType.replaceAll(/_/g, " ")}
            </Badge>
            <Blockquote
              color="gray"
              cite={
                <Text
                  size="sm"
                  onClick={() => {
                    navigateWithTextFragment(
                      finding.sourceId.toString(),
                      finding.excerpt,
                    );
                  }}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  {title}
                </Text>
              }
              p="xs"
              mb="sm"
            >
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
      )}
    </span>
  );
};
