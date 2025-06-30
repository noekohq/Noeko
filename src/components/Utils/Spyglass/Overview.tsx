import { Link, useNavigate } from "react-router";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import { ISearchOverview } from "../../../../app/services/Search";
import {
  ICitationMap,
  IResultsMap,
} from "../../../pages/Search/hooks/useSpyglass";
import { useCallback, useState } from "react";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { useLayout } from "../../../contexts/LayoutContext";
import OverviewParser from "./OverviewParser";
import {
  Accordion,
  AccordionItem,
  ActionIcon,
  Badge,
  Blockquote,
  Button,
  CopyButton,
  Group,
  HoverCard,
  Space,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import styles from "./Overview.module.scss";
import {
  ArrowLeftIcon,
  ArrowLineRightIcon,
  ArrowLineUpLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { markdownToHtml } from "../../../utils/formatting";

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
      leftSidebar: {
        mode: { toggle: toggleLeftSidebar, get: leftSidebarMode },
      },
    },
    leftSidebar: { setOpened: setLeftSidebarOpened, opened: leftSidebarOpened },
  } = useLayout();

  return (
    <div>
      <OverviewParser
        html={overview.overview}
        citationMap={citationMap}
        resultsMap={resultsMap}
        analysis={overview}
      />
      <Space my="lg" />
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
            {overview.findings.length} Findings
          </Button>
          <Button
            radius="lg"
            size="xs"
            variant="subtle"
            leftSection={
              leftSidebarMode === "collapsed" ? (
                <ArrowLineUpLeftIcon weight="bold" />
              ) : (
                <ArrowLineRightIcon weight="bold" />
              )
            }
            onClick={() => {
              toggleLeftSidebar();
            }}
          >
            Read {results?.length} Result{results?.length === 1 ? "" : "s"}
          </Button>
        </Group>
        <Group justify="end">
          {!loading && (
            <Group>
              <CopyButton value={overview.overview}>
                {({ copied, copy }) => {
                  return (
                    <ActionIcon variant="light" size="sm" onClick={copy}>
                      {!copied ? <CopyIcon /> : <CheckIcon />}
                    </ActionIcon>
                  );
                }}
              </CopyButton>
            </Group>
          )}
        </Group>
      </Group>
      {showFindings && (
        <>
          <Space my="lg" />
          <Accordion>
            {overview.findings
              .filter((finding) => {
                return finding.sourceId in resultsMap;
              })
              .map((finding, findingNumber) => {
                const { index: citationNumber } = citationMap[finding.sourceId];
                const mappedValue = resultsMap[finding.sourceId];
                const title =
                  mappedValue.type === "idea"
                    ? mappedValue.title
                    : mappedValue.id.toString();

                return (
                  <Accordion.Item value={findingNumber.toString()}>
                    <Accordion.Control>
                      <Group align="center">
                        <ActionIcon variant="light" size="xs">
                          <Text size="xs" fw="bold">
                            {findingNumber + 1}
                          </Text>
                        </ActionIcon>
                        <Badge variant="light" color="gray">
                          {finding.findingType.replaceAll(/_/g, " ")}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack key={findingNumber} mb="lg" gap="xs">
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
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
          </Accordion>
        </>
      )}
    </div>
  );
}
