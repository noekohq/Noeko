import { useState, useEffect, useCallback, useRef } from "react"; // Added useEffect, useCallback, useRef
import useFetch from '@/hooks/useFetch';
import { IIdea } from "../../../shared/types/idea";
import PageWrapper from '@/components/Layout/PageWrapper';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import { Loader, Center, Grid, Text, Group, Title, Divider, Stack, Button } from "@mantine/core"; // Added Loader and Center for UX
import styles from "./Ideas.module.scss";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "react-router";
import { useInteraction } from '@/contexts/InteractionContext';
import { useLayout } from '@/contexts/LayoutContext';
import Content from '@core/design/components/Layout/Content';
import StatusBar from '@core/design/components/Layout/Bottom';
import IdeaCard from '@/components/Display/Ideas/Interactions/IdeaCard';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';

export default function Ideas() {
  const { isMobile } = useLayout();
  const [page, setPage] = useState(0);
  const pageSize = isMobile ? 10 : 10;
  const [allIdeas, setAllIdeas] = useState<IIdea[]>([]);
  const {
    load: getPage,
    loading,
    data: newIdeasFetched,
  } = useFetch<undefined, IIdea[]>({
    url: `/ideas/page?page=${page}&pageSize=${pageSize}`,
    runOnDependencies: [page],
  });

  const observerTarget = useRef(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (newIdeasFetched && newIdeasFetched.length > 0) {
      setAllIdeas((prevIdeas) => {
        const existingIds = new Set(prevIdeas.map((idea) => idea.id)); // Assuming IIdea has an 'id'
        const uniqueNewIdeas = newIdeasFetched.filter((idea) => !existingIds.has(idea.id));
        return [...prevIdeas, ...uniqueNewIdeas];
      });
      setHasMore(newIdeasFetched.length === 10); // Assuming pageSize is 10. If less than 10 fetched, no more data.
    } else if (newIdeasFetched && newIdeasFetched.length === 0 && page > 0) {
      // If an empty array is returned and it's not the initial load, assume no more data
      setHasMore(false);
    }
  }, [newIdeasFetched, page]);

  // Intersection Observer to detect when the target element is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.01, root: null, rootMargin: "0px 0px 250px 0px" } // Trigger when 100% of the target is visible
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

  useEffect(() => {
    if (page === 0 && !loading) {
      getPage();
    }
  }, [getPage]);

  const {
    actions: { newIdea },
  } = useInteraction();

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack>
          <Title mt="md">Your ideas</Title>
          {allIdeas.map((idea, i) => (
            <IdeaCard key={idea.id.toString()} idea={idea} />
          ))}
        </Stack>
        {hasMore && !loading && <div ref={observerTarget} style={{ height: "1px" }} />}
        {loading && (
          <Group>
            <Loader size="sm" />
            <Text>Loading your ideas...</Text>
          </Group>
        )}
        {!hasMore && !loading && allIdeas.length > 0 && (
          <Center>
            <Text size="sm" c="dimmed">
              That's all :)
            </Text>
          </Center>
        )}
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
