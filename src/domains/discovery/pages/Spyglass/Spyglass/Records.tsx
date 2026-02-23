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
  Card,
  Badge,
} from "@mantine/core";
import PageWrapper from '@/components/Layout/PageWrapper';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import styles from "./Records.module.scss";
import { ArrowLeftIcon, ArrowRightIcon, CaretLeftIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { formatDateTime, markdownToHtml } from '@core/utils/formatting';
import useFetch from '@core/hooks/useFetch';
import { useLayout } from '@/contexts/LayoutContext';
import Content from '@core/design/components/Layout/Content';
import StatusBar from '@core/design/components/Layout/Bottom';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';
import { Link, useNavigate } from "react-router";
import {
  ISpyglassHistoryResponse,
  ISpyglassLightHistoryResponse,
  ISpyglassRecord,
} from '../../../../../../app/database/models/spyglass_record';

export default function SpyglassHistory() {
  const { isMobile } = useLayout();
  const [page, setPage] = useState(1);
  const pageSize = isMobile ? 10 : 10;
  const [allHistory, setAllHistory] = useState<ISpyglassLightHistoryResponse["history"]>([]);
  const [hasMore, setHasMore] = useState(true);

  const {
    loading,
    data: apiResponse,
    errors,
  } = useFetch<undefined, ISpyglassLightHistoryResponse>({
    url: `/search/spyglass/history/light?page=${page}&pageSize=${pageSize}`,
    runOnDependencies: [page],
  });

  const observerTarget = useRef(null);

  useEffect(() => {
    if (apiResponse?.history) {
      const { history: newItems, total } = apiResponse;

      setAllHistory((prevHistory) => {
        const existingIds = new Set(prevHistory.map((item) => item.id));
        const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id));
        const updatedHistory = [...prevHistory, ...uniqueNewItems];

        const isEnd =
          newItems.length < pageSize || updatedHistory.length >= total || newItems.length === 0;

        setHasMore(!isEnd);
        return updatedHistory;
      });

      if (page === 1 && newItems.length === 0) {
        setAllHistory([]);
        setHasMore(false);
      }
    }

    if (errors && errors.length > 0) {
      setHasMore(false);
    }
  }, [apiResponse, errors, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.01, root: null, rootMargin: "0px 0px 250px 0px" }
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
  }, [hasMore, loading, observerTarget.current]);

  const navigate = useNavigate();

  return (
    <>
      <PageWrapper>
        <TopBar />
        <LeftSidebar />
        <Content>
          <Stack mt="md">
            <Group justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <ActionIcon
                  onClick={() => navigate(-1)}
                  color="gray"
                  variant="subtle"
                  size={"md"}
                  radius={"md"}
                >
                  <ArrowLeftIcon weight="bold" />
                </ActionIcon>
              </Group>
            </Group>
            <Title order={2} mb="sm">
              Spyglass History
            </Title>

            {errors && errors.length > 0 && page === 1 && allHistory.length === 0 && (
              <Center mt="xl">
                <Stack align="center">
                  <Text c="red" ta="center">
                    Error loading history: {errors[0] || "An unknown error occurred."}
                  </Text>
                  <Text c="dimmed" size="sm">
                    Please try refreshing the page. If the problem persists, check your connection
                    or contact support.
                  </Text>
                </Stack>
              </Center>
            )}

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
                  <Grid.Col span={{ base: 12 }} key={item.id.toString()}>
                    <Box
                      py="sm"
                      className={styles.historyItem}
                      onClick={() => navigate(`/spyglass/records/${item.id}`)}
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(`/spyglass/records/${item.id}`);
                        }
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap" align="center">
                        <Stack gap={4} style={{ flexGrow: 1, overflow: "hidden" }}>
                          <Group gap="xs">
                            <Text lineClamp={1} fw={600} size="sm">
                              "{item.baseQuery}"
                            </Text>
                            {item.isDeepAnalysis ? (
                              <Badge size="xs" variant="light" color="blue">
                                Deep Focus
                              </Badge>
                            ) : (
                              <Badge size="xs" variant="light" color="gray">
                                Glimpse
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            {formatDateTime(item.createdAt)}
                          </Text>
                        </Stack>
                        <ArrowRightIcon color="var(--mantine-color-dimmed)" />
                      </Group>
                    </Box>
                  </Grid.Col>
                ))}
              </Grid>
            )}

            {hasMore && !loading && (
              <div
                ref={observerTarget}
                style={{ height: "1px", marginTop: "1rem" }}
                aria-hidden="true"
              />
            )}

            {loading && (
              <Center mt="lg" mb="lg">
                <Loader />
                <Text ml="sm">Loading more history...</Text>
              </Center>
            )}

            {!hasMore && !loading && allHistory.length > 0 && (
              <Center mt="lg" mb="lg">
                <Text c="dimmed" size="sm">
                  That's all :)
                </Text>
              </Center>
            )}
          </Stack>
        </Content>
        <Nav />
        <RightSidebar />
      </PageWrapper>
    </>
  );
}
