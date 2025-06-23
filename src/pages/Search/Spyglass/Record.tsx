import React, { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/LeftSidebar";
import RightSidebar from "../../../components/UI/RightSidebar";
import {
  ActionIcon,
  Button,
  Container,
  Grid,
  Group,
  HoverCard,
  Space,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import useFetch from "../../../hooks/useFetch";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import { showNotification } from "@mantine/notifications";
import styles from "./Record.module.scss";
import {
  ICitationMap,
  IResultsMap,
  useSpyglassRecord,
} from "../hooks/useSpyglass";
import { capitalize, markdownToHtml } from "../../../utils/formatting";
import {
  ArrowLeftIcon,
  ArrowRight,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
import { ISearchOverview } from "../../../../app/services/Search";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { useLayout } from "../../../contexts/LayoutContext";

export default function SpyglassRecord() {
  const { spyglassId } = useParams<{ spyglassId: string }>();

  const { spyglass, resultMap, citationMap } = useSpyglassRecord({
    spyglassId,
  });

  const overview = spyglass?.analysis;
  const baseQuery = spyglass?.baseQuery;
  const results = spyglass?.fullResults;

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container
        style={{
          overflowY: "scroll",
          scrollbarWidth: "none",
        }}
        w="100%"
        py="lg"
      >
        <Grid>
          {overview && (
            <Grid.Col>
              {overview &&
                overview.overview &&
                baseQuery &&
                results && ( // Ensure overview and overview.overview exist
                  <>
                    <div className={styles.overviewDisplay}>
                      <DisplayOverview
                        overview={overview}
                        resultsMap={resultMap ?? {}}
                        citationMap={citationMap ?? {}}
                        query={baseQuery}
                        results={results}
                      />
                    </div>
                  </>
                )}
            </Grid.Col>
          )}
        </Grid>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}

type IDisplayOverview = {
  overview: ISearchOverview;
  resultsMap: IResultsMap;
  citationMap: ICitationMap;
  query: string;
  results: ISpyglassSearch["fullResults"];
};

function DisplayOverview({
  overview,
  resultsMap,
  citationMap,
  query,
  results,
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
    leftSidebar: { setOpened: setLeftSidebarOpened, opened: leftSidebarOpened },
  } = useLayout();

  return (
    <div>
      <Title order={2} mb="lg">
        {capitalize(query)}
      </Title>
      <div
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(overview.overview),
        }}
      />
      <Space my="lg" />
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
            leftSidebarOpened ? (
              <ArrowRightIcon weight="bold" />
            ) : (
              <ArrowLeftIcon weight="bold" />
            )
          }
          onClick={() => {
            setLeftSidebarOpened(!leftSidebarOpened);
          }}
        >
          Read {results?.length} Result{results?.length === 1 ? "" : "s"}
        </Button>
      </Group>
      {showFindings && (
        <>
          <Text mt="md">
            {overview.findings
              .filter((finding) => {
                return finding.sourceId in resultsMap;
              })
              .map((finding) => {
                const { index: citationNumber } = citationMap[finding.sourceId];
                const mappedValue = resultsMap[finding.sourceId];
                const title =
                  mappedValue.type === "idea"
                    ? mappedValue.title
                    : mappedValue.id.toString();

                return (
                  <Text component="span" mr="xs">
                    <HoverCard width={"400px"} withArrow>
                      <HoverCard.Target>
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          mr="2px"
                          onClick={() =>
                            navigateWithTextFragment(
                              mappedValue.id.toString(),
                              finding.excerpt,
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <Text size="xs">({citationNumber})</Text>
                        </ActionIcon>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Stack>
                          <UnstyledButton
                            onClick={() =>
                              navigateWithTextFragment(
                                mappedValue.id.toString(),
                                finding.excerpt,
                              )
                            }
                            style={{ textDecoration: "none" }}
                          >
                            <Group>
                              <Text fw="bold" c="gray" size="xs">
                                {title}
                              </Text>
                              <ArrowRight
                                size={14}
                                color="gray"
                                weight="bold"
                              />
                            </Group>
                          </UnstyledButton>
                          <Text size="xs">...{finding.excerpt}...</Text>
                        </Stack>
                      </HoverCard.Dropdown>
                    </HoverCard>
                    {finding.analysis}
                  </Text>
                );
              })}
          </Text>
        </>
      )}
    </div>
  );
}
