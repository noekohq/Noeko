import { useEffect, useState, useRef } from "react";
import useFetch from "../../../hooks/useFetch";
import styles from "./Think.module.scss";
import {
  IIdeaSortFields,
  ISafeIdea,
} from "../../../../app/database/models/ideas";
import IdeaButton from "../../../components/Display/Ideas/Interactions/IdeaButton";
import { Box, Group, Stack, Text, Loader, Center } from "@mantine/core";
import { SearchBar } from "../../../components/Search/SearchBar";
import { useSearch } from "../../../contexts/SearchContext";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import {
  ClockClockwiseIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import Selection from "../../../components/Display/Interactions/Selection";

export default function Think() {
  const [sortField, setSortField] = useState<IIdeaSortFields>("viewedAt");
  const [start, setStart] = useState(0);
  const limit = 25;
  const [allIdeas, setAllIdeas] = useState<ISafeIdea[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    data: newIdeas,
    loading,
    load: getPage,
  } = useFetch<undefined, ISafeIdea[]>({
    url: "/ideas",
    query: {
      sortField: sortField,
      sortDirection: "asc",
      limit: limit.toString(),
      start: start.toString(),
    },
    runOnDependencies: [start, sortField],
  });

  useEffect(() => {
    if (start === 0 && !loading) {
      getPage();
    }
  }, [start]);

  useEffect(() => {
    if (newIdeas) {
      setAllIdeas((prevIdeas) => {
        const existingIds = new Set(prevIdeas.map((idea) => idea.id));
        const uniqueNewIdeas = newIdeas.filter(
          (idea) => !existingIds.has(idea.id),
        );
        return [...prevIdeas, ...uniqueNewIdeas];
      });
      setHasMore(newIdeas.length === limit);
    }
  }, [newIdeas]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setStart((prevStart) => prevStart + limit);
        }
      },
      {
        root: scrollContainer,
        threshold: 0.01,
        rootMargin: "0px 0px 800px 0px",
      },
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
  }, [hasMore, loading, observerTarget.current, scrollContainerRef.current]);

  useEffect(() => {
    setAllIdeas([]);
    setStart(0);
    setHasMore(true);
  }, [sortField]);

  const {
    global: {
      query: { get: searchQuery },
      results: { get: searchResults },
    },
  } = useSearch();

  useEffect(() => {
    if (!searchQuery && !loading) {
      getPage();
    }
  }, [searchQuery]);

  const hasSearch = searchQuery.length > 0;

  const firstIdea = allIdeas?.[0];
  const rest = firstIdea ? allIdeas.slice(1, allIdeas.length) : allIdeas;

  return (
    <div className={styles.think}>
      {!hasSearch && (
        <Group mb="md">
          <Selection
            initialValue={sortField}
            options={[
              {
                label: "Viewed",
                value: "viewedAt" as IIdeaSortFields,
                icon: <ClockCounterClockwiseIcon />,
              },
              {
                label: "Created",
                value: "createdAt" as IIdeaSortFields,
                icon: <ClockIcon />,
              },
              {
                label: "Updated",
                value: "updatedAt" as IIdeaSortFields,
                icon: <ClockClockwiseIcon />,
              },
            ]}
            onSelect={(v) => {
              setSortField(v as IIdeaSortFields);
            }}
          />
        </Group>
      )}
      <div ref={scrollContainerRef} className={styles.scrollArea}>
        {hasSearch ? (
          <Stack gap="md">
            {searchResults?.map((s) => {
              return <ConnectableThing key={s.id.toString()} thing={s.value} />;
            })}
          </Stack>
        ) : (
          <Stack gap="sm">
            {firstIdea && start === 0 && (
              <Box
                p="sm"
                style={{
                  border: "1px solid var(--mantine-color-dark-7)",
                  borderRadius: "var(--mantine-radius-lg)",
                }}
              >
                <Stack>
                  <Text size="sm" c="dimmed">
                    Jump Back In
                  </Text>
                  <IdeaButton
                    idea={firstIdea}
                    onClick={() => {
                      navigate(`/idea/${firstIdea.id.toString()}`);
                    }}
                  />
                </Stack>
              </Box>
            )}
            {rest?.map((idea) => {
              return <IdeaButton key={idea.id.toString()} idea={idea} />;
            })}
            {hasMore && !loading && (
              <div ref={observerTarget} style={{ height: "1px" }} />
            )}
            {loading && (
              <Group justify="center">
                <Loader size="sm" />
              </Group>
            )}
            {!hasMore && !loading && allIdeas.length > 0 && (
              <Center>
                <Text size="sm" c="dimmed">
                  That's all :)
                </Text>
              </Center>
            )}
          </Stack>
        )}
      </div>
    </div>
  );
}
