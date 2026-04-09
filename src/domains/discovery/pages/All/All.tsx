import { useState, useEffect, useRef, useCallback } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { IGetAllConnectables_Options, ITaggedConnectable } from "../../../../../app/services/Graph";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { Loader, Center, Text, Group, Title, Stack, SimpleGrid } from "@mantine/core";
import Content from "@core/design/components/Layout/Content";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { getThingPropsFromConnectable } from "@core/design/components/Paper/Things/thingUtils";
import GridCard from "@core/design/components/Paper/Things/GridCard";
import { formatDateTime } from "@core/utils/formatting";
import { api } from "@infrastructure/api/client";
import { DefaultResponse } from "@/declarations/server";
import TagsFilter from "@/core/design/components/Display/Interactions/Tags/TagsFilter";
import { ITag } from "../../../../../shared/types/tags";
import PaperTag from "@core/design/components/Paper/Tags/PaperTag";

interface AllConnectablesResponse {
  items: ITaggedConnectable[];
  nextCursor: string | null;
}

export default function All() {
  const { i18n } = useLingui();
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<ITaggedConnectable[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [appliedTags, setAppliedTags] = useState<ITag[]>([]);

  const fetchPage = useCallback(
    async (options: { cursor?: string | null; tags?: ITag[]; isNewSearch?: boolean }) => {
      const { cursor, tags, isNewSearch } = options;
      if (loading) return;
      setLoading(true);

      const body: IGetAllConnectables_Options = {
        limit: 20,
        sortField: "updatedAt",
        sortDirection: "DESC",
        ...(cursor && { cursor }),
        ...(tags &&
          tags.length > 0 && {
            filters: {
              tags: {
                set: tags.map((t) => t.id.toString()),
                behavior: "and",
              },
            },
          }),
      };

      try {
        const response = await api.post<DefaultResponse<AllConnectablesResponse>>(
          `/graph/all`,
          body
        );
        const data = response.data.data;

        if (data) {
          if (isNewSearch) {
            setItems(data.items);
          } else {
            setItems((prevItems) => {
              const existingIds = new Set(prevItems.map((item) => item.id));
              const uniqueNewItems = data.items.filter((item) => !existingIds.has(item.id));
              return [...prevItems, ...uniqueNewItems];
            });
          }
          setCursor(data.nextCursor);
          setHasMore(!!data.nextCursor);
        } else {
          if (isNewSearch) setItems([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch connectables:", error);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const observerTarget = useRef(null);

  // Effect for tag changes
  useEffect(() => {
    // This will trigger a new search whenever appliedTags change.
    fetchPage({ tags: appliedTags, isNewSearch: true });
  }, [appliedTags]);

  // Effect for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          // Pass cursor for pagination and current tags
          fetchPage({ cursor, tags: appliedTags });
        }
      },
      { threshold: 0.01, root: null, rootMargin: "0px 0px 400px 0px" }
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
  }, [hasMore, loading, cursor, appliedTags, fetchPage]);

  // Create a Set of active IDs for O(1) lookup during rendering
  const activeTagIds = new Set(appliedTags.map((t) => t.id.toString()));

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack>
          <Title mt="md">
            <Trans>Everything</Trans>
          </Title>
          <TagsFilter
            value={appliedTags}
            onChange={(tags) => {
              setAppliedTags(tags);
            }}
          />
          <SimpleGrid
            spacing="xs"
            cols={{
              base: 2,
              sm: 2,
              md: 3,
            }}
          >
            {items.map((item) => {
              const props = getThingPropsFromConnectable(
                item,
                {
                  detail: i18n._(t`Updated ${formatDateTime(item.updatedAt)}`),
                },
                true
              );

              // SORTING LOGIC:
              // 1. Matched tags (in activeTagIds) go first
              // 2. Unmatched tags follow
              const sortedTags = [...item.appliedTags].sort((a, b) => {
                const aIsActive = activeTagIds.has(a.id.toString());
                const bIsActive = activeTagIds.has(b.id.toString());

                if (aIsActive && !bIsActive) return -1;
                if (!aIsActive && bIsActive) return 1;
                return 0;
              });

              return (
                <GridCard
                  key={item.id.toString()}
                  {...props}
                  footerContent={
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--mantine-spacing-xs)",
                        flexWrap: "nowrap",
                        overflow: "hidden",
                        width: "100%",
                        height: "28px",
                        alignItems: "center",
                        maskImage: "linear-gradient(to right, black 85%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to right, black 85%, transparent 100%)",
                      }}
                    >
                      {sortedTags.map((t) => {
                        const isMatch = activeTagIds.has(t.id.toString());
                        return (
                          <PaperTag
                            key={t.id.toString()}
                            tag={t}
                            state={"display"}
                            size="xs"
                            maxWidth={120}
                          />
                        );
                      })}
                    </div>
                  }
                />
              );
            })}
          </SimpleGrid>
        </Stack>
        {hasMore && !loading && <div ref={observerTarget} style={{ height: "1px" }} />}
        {loading && (
          <Center mt="xl">
            <Group>
              <Loader size="sm" />
              <Text>
                <Trans>Loading...</Trans>
              </Text>
            </Group>
          </Center>
        )}
        {!hasMore && !loading && items.length > 0 && (
          <Center mt="xl">
            <Text size="sm" c="dimmed">
              <Trans>That's all of it :)</Trans>
            </Text>
          </Center>
        )}
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
