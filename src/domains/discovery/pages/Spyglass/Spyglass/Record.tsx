import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { useSpyglassRecord } from "@domains/discovery/pages/Spyglass/hooks/useSpyglass";

import styles from "./Record.module.scss";
import { DisplayOverview } from "@domains/discovery/components/Spyglass/Overview";
import Content from "@core/design/components/Layout/Content";
import { useDocumentTitle } from "@core/hooks/useDocumentTitle";
import { ArrowLeftIcon, ClockCounterClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import SpyglassActions from "./SpyglassActions";
import Nav from "@core/design/components/Layout/Nav";
import { Link, useNavigate, useParams } from "react-router";
import GlimpseModeDisplay from "@domains/discovery/components/Spyglass/GlimpseModeDisplay";
import GlimpseNavigation from "@domains/discovery/components/Spyglass/GlimpseNavigation";
import DeepFocusNavigation from "@domains/discovery/components/Spyglass/DeepFocusNavigation";

export default function SpyglassRecord() {
  const { spyglassId } = useParams<{ spyglassId: string }>();
  const navigate = useNavigate();

  const { spyglass, resultMap, citationMap, results, fullResults, glimpseResult } =
    useSpyglassRecord({
      spyglassId,
    });

  const overview = spyglass?.overview ?? "";
  const findings = spyglass?.findings ?? [];
  const baseQuery = spyglass?.baseQuery;
  const isDeepAnalysis = spyglass?.isDeepAnalysis ?? true;

  useDocumentTitle(baseQuery ? `${baseQuery} - Noeko` : "Noeko");

  return (
    <PageWrapper>
      <LeftSidebar
        topLevel={{
          open: (
            <>
              <Link to="/spyglass/history">
                <ActionIcon
                  aria-label="View Spyglass history"
                  color="gray"
                  radius="lg"
                  variant="light"
                >
                  <ClockCounterClockwiseIcon />
                </ActionIcon>
              </Link>
            </>
          ),
        }}
      >
        <LeftSidebar.Open>
          {!isDeepAnalysis && glimpseResult && glimpseResult.contentMap.length > 0 ? (
            <GlimpseNavigation glimpseResult={glimpseResult} resultsMap={resultMap ?? {}} />
          ) : isDeepAnalysis && overview ? (
            <DeepFocusNavigation
              overview={overview}
              findings={findings}
              resultsMap={resultMap ?? {}}
            />
          ) : (
            <Stack gap="xs">
              <Text fw="bold" c="dimmed" size="sm">
                No results yet
              </Text>
              <Text size="xs" c="dimmed">
                Ask something to see the outline here
              </Text>
            </Stack>
          )}
        </LeftSidebar.Open>
        <LeftSidebar.Collapsed>
          <Stack>
            <Link to="/spyglass/history">
              <ActionIcon aria-label="View Spyglass history" color="gray" variant="light" size="sm">
                <ClockCounterClockwiseIcon />
              </ActionIcon>
            </Link>
          </Stack>
        </LeftSidebar.Collapsed>
      </LeftSidebar>
      <Content>
        <Stack mt="md">
          <Group justify="space-between" wrap="nowrap">
            <Group wrap="nowrap">
              <ActionIcon
                aria-label="Go back"
                onClick={() => navigate(-1)}
                color="gray"
                variant="subtle"
                size="md"
                radius="md"
              >
                <ArrowLeftIcon weight="bold" />
              </ActionIcon>
            </Group>
            <Button
              color="gray"
              component={Link}
              leftSection={<PlusIcon />}
              size="compact-sm"
              to="/spyglass"
              variant="subtle"
            >
              New query
            </Button>
          </Group>
          <div className={styles.overviewDisplay}>
            {isDeepAnalysis ? (
              <DisplayOverview
                overview={overview}
                findings={findings}
                resultsMap={resultMap ?? {}}
                citationMap={citationMap ?? {}}
                query={baseQuery ?? ""}
                results={results ?? []}
              />
            ) : glimpseResult ? (
              <GlimpseModeDisplay
                glimpseResult={glimpseResult}
                resultsMap={resultMap ?? {}}
                query={baseQuery ?? ""}
              />
            ) : (
              <Text c="dimmed">No content available for this record.</Text>
            )}
          </div>
        </Stack>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          {!!spyglass && <SpyglassActions intent={spyglass?.intent} results={fullResults ?? []} />}
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
