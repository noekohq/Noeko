import { useState, useEffect, useCallback, useRef } from "react"; // Added useEffect, useCallback, useRef
import useFetch from "../../hooks/useFetch";
import { IIdea } from "../../../app/database/models/ideas";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import {
  Container,
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
import IdeaCard from "../../components/Display/Ideas/IdeaCard";
import styles from "./Ideas.module.scss";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Link } from "react-router";
import { useInteraction } from "../../contexts/InteractionContext";

export default function Ideas() {
  const [page, setPage] = useState(0);
  const [allIdeas, setAllIdeas] = useState<IIdea[]>([]);
  // Assuming your useFetch hook has a loading state
  const {
    load: getPage,
    loading,
    data: newIdeasFetched,
  } = useFetch<undefined, IIdea[]>({
    url: `/ideas/page?page=${page}&pageSize=10`,
    runOnDependencies: [page], // This will trigger a fetch when 'page' changes
  });

  // Ref for the element that will trigger loading more items
  const observerTarget = useRef(null);

  // State to track if there's more data to load
  const [hasMore, setHasMore] = useState(true);

  // Append new ideas when newIdeasFetched changes
  useEffect(() => {
    if (newIdeasFetched && newIdeasFetched.length > 0) {
      setAllIdeas((prevIdeas) => {
        // Prevent adding duplicate ideas if the same page is fetched multiple times
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
      { threshold: 1.0 }, // Trigger when 100% of the target is visible
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
    if (page === 0) {
      getPage();
    }
  }, [getPage]);

  const {
    actions: { newIdea },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container className={styles.ideas} w="100%">
        <Stack>
          <Title mt="md">All your great ideas...</Title>
          <Group justify="start">
            <Link to="/spyglass">
              <Button
                variant="light"
                leftSection={<MagnifyingGlass weight="bold" />}
              >
                Search your ideas...
              </Button>
            </Link>
            <Button
              variant="filled"
              leftSection={<Plus weight="bold" />}
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
          {allIdeas.map((idea) => (
            <Grid.Col key={idea.id.toString()} span={{ sm: 6 }}>
              <IdeaCard idea={idea} link />
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
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
