import { useState, useEffect, useCallback, useRef } from "react";
import {
  ActionIcon,
  Blockquote,
  Box,
  Container,
  Drawer,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Center,
  Button,
} from "@mantine/core";
import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/LeftSidebar";
import RightSidebar from "../../../components/UI/RightSidebar";
import styles from "./Records.module.scss";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretLeftIcon,
  DotsThreeIcon,
} from "@phosphor-icons/react";
import { CompactIdeaCard } from "../../../components/Display/Ideas/IdeaCards";
import { formatDateTime, markdownToHtml } from "../../../utils/formatting";
import useFetch from "../../../hooks/useFetch";
import { useLayout } from "../../../contexts/LayoutContext";
import { Link } from "react-router";

export default function SpyglassHistory() {
  const { isMobile } = useLayout();
  const [page, setPage] = useState(0);

  const pageSize = isMobile ? 10 : 10;
  const [allHistory, setAllHistory] = useState<ISpyglassSearch[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [viewing, setViewing] = useState<ISpyglassSearch | undefined>(
    undefined,
  );

  const {
    load: getHistoryPage,
    loading,
    data: newHistoryFetched,
    errors,
  } = useFetch<undefined, ISpyglassSearch[]>({
    url: `/search/spyglass/history/light?page=${page}&pageSize=${pageSize}`,
    runOnDependencies: [page],
  });

  useEffect(() => {
    if (page === 0 && !loading) {
      getHistoryPage();
    }
  }, [getHistoryPage]);

  const observerTarget = useRef(null);

  useEffect(() => {
    if (newHistoryFetched && newHistoryFetched.length > 0) {
      setAllHistory((prevHistory) => {
        const existingIds = new Set(
          prevHistory.map((item) => item.id!.toString()), // Assuming ISpyglassSearch has an 'id'
        );
        const uniqueNewItems = newHistoryFetched.filter(
          (item) => !existingIds.has(item.id!.toString()),
        );
        return [...prevHistory, ...uniqueNewItems];
      });
      setHasMore(newHistoryFetched.length === pageSize);
    } else if (newHistoryFetched && newHistoryFetched.length === 0) {
      // If an empty array is returned (either initial load or subsequent)
      if (page === 0) {
        setAllHistory([]); // Clear history if the very first page is empty
      }
      setHasMore(false); // No more data
    }

    if (errors && errors.length > 0) {
      setHasMore(false); // Stop trying to load more if there's an error
    }
  }, [newHistoryFetched, page, pageSize, errors]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.01, root: null, rootMargin: "0px 0px 250px 0px" },
    );

    const currentObserverTarget = observerTarget.current;
    if (currentObserverTarget) {
      observer.observe(currentObserverTarget);
    }

    return () => {
      if (currentObserverTarget) {
        observer.unobserve(currentObserverTarget);
      }
    };
  }, [hasMore, loading, observerTarget.current]); // observerTarget.current is crucial here

  return (
    <>
      <Drawer
        opened={viewing !== undefined}
        onClose={() => setViewing(undefined)}
        position="right"
        size="lg"
      >
        {viewing && (
          <Stack p="md">
            <Group>
              <Link to={`/spyglass/records/${viewing.id}`}>
                <Button
                  variant="light"
                  size="xs"
                  rightSection={<ArrowRightIcon weight="bold" />}
                >
                  View Full
                </Button>
              </Link>
            </Group>
            <Title order={4}>{viewing.baseQuery}</Title>
            {viewing.analysis?.overview && (
              <Blockquote>
                <Text fw="bold" c="dimmed" size="xs" mb="sm">
                  ANSWER
                </Text>
                <Text
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(viewing.analysis.overview),
                  }}
                />
              </Blockquote>
            )}
          </Stack>
        )}
      </Drawer>
      <PageWrapper>
        <LeftSidebar />
        <Container className={styles.container} py="lg" fluid>
          <Stack>
            <Group mb="lg">
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
            </Group>
            <Title order={2} mb="sm">
              Your Spyglass History
            </Title>

            {/* Error display for initial load failure */}
            {errors &&
              errors.length > 0 &&
              page === 0 &&
              allHistory.length === 0 && (
                <Center mt="xl">
                  <Stack align="center">
                    <Text c="red" ta="center">
                      Error loading history:{" "}
                      {errors[0] || "An unknown error occurred."}
                    </Text>
                    <Text c="dimmed" size="sm">
                      Please try refreshing the page. If the problem persists,
                      check your connection or contact support.
                    </Text>
                  </Stack>
                </Center>
              )}

            {/* No history found message */}
            {!loading &&
              !hasMore &&
              allHistory.length === 0 &&
              (!errors || errors.length === 0) && (
                <Center mt="xl">
                  <Text>No spyglass history found.</Text>
                </Center>
              )}

            {allHistory.length > 0 && (
              <Grid>
                {allHistory.map((item) => (
                  <Grid.Col span={{ base: 12 }} key={item.id?.toString()}>
                    <Box
                      p="sm"
                      className={styles.historyItem}
                      onClick={() => setViewing(item)}
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setViewing(item);
                        }
                      }}
                    >
                      <Group
                        justify="space-between"
                        wrap="nowrap"
                        align="center"
                      >
                        <Stack
                          gap="xs"
                          style={{ flexGrow: 1, overflow: "hidden" }}
                        >
                          <Text lineClamp={2} fw={500}>
                            "{item.baseQuery}"
                          </Text>
                          <Text size="sm" c="dimmed">
                            {item.analysis?.findings.length} finding
                            {item.analysis?.findings.length === 1
                              ? ""
                              : "s"},{" "}
                            {formatDateTime(item.createdAt).toLowerCase()}
                          </Text>
                        </Stack>
                        <ActionIcon
                          variant="subtle"
                          aria-label="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewing(item);
                          }}
                        >
                          <DotsThreeIcon weight="bold" size={20} />
                        </ActionIcon>
                      </Group>
                    </Box>
                  </Grid.Col>
                ))}
              </Grid>
            )}

            {/* Invisible target for IntersectionObserver */}
            {hasMore && !loading && (
              <div
                ref={observerTarget}
                style={{ height: "1px", marginTop: "1rem" }}
                aria-hidden="true"
              />
            )}

            {/* Loading indicator at the bottom */}
            {loading && (
              <Center mt="lg" mb="lg">
                <Loader />
                <Text ml="sm">Loading more history...</Text>
              </Center>
            )}

            {/* End of list message */}
            {!hasMore && !loading && allHistory.length > 0 && (
              <Center mt="lg" mb="lg">
                <Text c="dimmed" size="sm">
                  That's all :)
                </Text>
              </Center>
            )}
          </Stack>
        </Container>
        <RightSidebar />
      </PageWrapper>
    </>
  );
}
