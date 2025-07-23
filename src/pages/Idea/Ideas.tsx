import { useState, useEffect, useCallback, useRef } from "react"; // Added useEffect, useCallback, useRef
import useFetch from "../../hooks/useFetch";
import { IIdea } from "../../../app/database/models/ideas";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import {
  Loader,
  Center,
  Grid,
  Text,
  Group,
  Title,
  Divider,
  Stack,
  Button,
} from "@mantine/core"; // Added Loader and Center for UX
import styles from "./Ideas.module.scss";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "react-router";
import { useInteraction } from "../../contexts/InteractionContext";
import { useLayout } from "../../contexts/LayoutContext";
import Content from "../../components/UI/Layout/Content";
import StatusBar from "../../components/UI/Layout/Bottom";
import IdeaCard from "../../components/Display/Ideas/Interactions/IdeaCard";

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
        const uniqueNewIdeas = newIdeasFetched.filter(
          (idea) => !existingIds.has(idea.id),
        );
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
      { threshold: 0.01, root: null, rootMargin: "0px 0px 250px 0px" }, // Trigger when 100% of the target is visible
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
      <LeftSidebar />
      <Content>
        <Stack>
          <Title mt="md">All your great ideas...</Title>
          <Group justify="start">
            <Link to="/spyglass">
              <Button
                variant="light"
                leftSection={<MagnifyingGlassIcon weight="bold" />}
              >
                Search your ideas...
              </Button>
            </Link>
            <Button
              variant="filled"
              leftSection={<PlusIcon weight="bold" />}
              onClick={() => {
                newIdea();
              }}
            >
              Add an idea...
            </Button>
          </Group>
        </Stack>
        <Divider my="lg" />
        <Grid>
          {allIdeas.map((idea, i) => (
            <Grid.Col key={idea.id.toString()} span={{ sm: 6 }}>
              <IdeaCard idea={idea} />
            </Grid.Col>
          ))}
        </Grid>
        {hasMore && !loading && (
          <div ref={observerTarget} style={{ height: "1px" }} />
        )}
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
      <StatusBar />
      <RightSidebar />
    </PageWrapper>
  );
}
