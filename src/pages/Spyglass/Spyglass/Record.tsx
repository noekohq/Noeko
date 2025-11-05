import { Link, useNavigate, useParams } from "react-router";
import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/Layout/Left";
import RightSidebar from "../../../components/UI/Layout/Right";
import {
  Accordion,
  ActionIcon,
  Badge,
  Container,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useSpyglassRecord } from "../hooks/useSpyglass";
import {
  capitalize,
  numberToLetter,
  sanitizeMarkdownForDescription,
} from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { getNodeAsIdeaOrNull } from "../../../utils/graph";
import Match from "../../../components/Utils/Match";
import { getSearchResultPreview } from "../../../utils/search";

import styles from "./Record.module.scss";
import OverviewParser from "../../../components/Utils/Spyglass/OverviewParser";
import { DisplayOverview } from "../../../components/Utils/Spyglass/Overview";
import Content from "../../../components/UI/Layout/Content";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useLayout } from "../../../contexts/LayoutContext";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";
import StatusBar from "../../../components/UI/Layout/Bottom";
import IdeaCard from "../../../components/Display/Ideas/Interactions/IdeaCard";
import SpyglassContext from "./SpyglassContext";
import SpyglassActions from "./SpyglassActions";
import Nav from "../../../components/UI/Layout/Nav";

export default function SpyglassRecord() {
  const { spyglassId } = useParams<{ spyglassId: string }>();

  const { spyglass, resultMap, citationMap, loading } = useSpyglassRecord({
    spyglassId,
  });

  const overview = spyglass?.analysis;
  const baseQuery = spyglass?.baseQuery;
  const results = spyglass?.fullResults;

  useDocumentTitle(baseQuery ? `${baseQuery} - Noeko` : "Noeko");

  const {
    elements: {
      leftSidebar: {
        mode: { get: leftSidebar, set: setLeftSidebar },
      },
    },
  } = useLayout();

  return (
    <PageWrapper>
      <LeftSidebar
        topLevel={{
          open: (
            <>
              <Link to="/spyglass/history">
                <ActionIcon color="gray" radius="lg" variant="light">
                  <ClockCounterClockwiseIcon />
                </ActionIcon>
              </Link>
            </>
          ),
        }}
      >
        <LeftSidebar.Open>
          {!!spyglass && citationMap && results && (
            <SpyglassContext citationMap={citationMap} results={results} />
          )}
        </LeftSidebar.Open>
        <LeftSidebar.Collapsed>
          <Stack>
            {overview && overview.findings.length > 0 && (
              <ActionIcon
                variant="light"
                size="sm"
                radius="md"
                color="gray"
                onClick={() => {
                  setLeftSidebar("open");
                }}
              >
                <Text size="xs">{overview.findings.length}</Text>
              </ActionIcon>
            )}
            <Link to="/spyglass/history">
              <ActionIcon color="gray" variant="light" size="sm">
                <ClockCounterClockwiseIcon />
              </ActionIcon>
            </Link>
          </Stack>
        </LeftSidebar.Collapsed>
      </LeftSidebar>
      <Content>
        <Grid>
          <Grid.Col>
            <Link
              to="/spyglass"
              style={{
                textDecoration: "none",
              }}
            >
              <Group c="dark.3" gap="xs">
                <CaretLeftIcon weight="bold" size={13} />
                <Text c="dark.3" size="sm">
                  Back to Spyglass
                </Text>
              </Group>
            </Link>
          </Grid.Col>
          <Grid.Col>
            <Text className={styles.queryHeader} size="lg" fs="italic">
              {spyglass?.baseQuery ? spyglass?.baseQuery : "No title"}
            </Text>
          </Grid.Col>
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
                        loading={loading}
                      />
                    </div>
                  </>
                )}
            </Grid.Col>
          )}
        </Grid>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          {!!spyglass && (
            <SpyglassActions
              intent={spyglass?.intent}
              results={results ?? []}
            />
          )}
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
