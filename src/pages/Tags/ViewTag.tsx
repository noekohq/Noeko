import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Stack,
  Loader,
  Alert,
  LoadingOverlay,
  Button,
  Overlay,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import useFetch from "../../hooks/useFetch";
import { ITag } from "../../../app/database/models/tag";
import { Link, useNavigate, useParams } from "react-router";
import { IIdea } from "../../../app/database/models/ideas";
import { ArrowLeft, Tag, WarningCircle } from "@phosphor-icons/react";
import { BlockTag } from "../../components/Tags/TagDisplay";
import {
  CompactIdeaCard,
  StandardIdeaCard,
} from "../../components/Display/Ideas/IdeaCards";
import { addTagToIdea, removeTagFromIdea } from "../../utils/ideas"; // Import new utility functions
import { showNotification } from "@mantine/notifications";
import styles from "./ViewTag.module.scss";
import { useState } from "react";

export default function ViewTag() {
  const navigate = useNavigate();
  const { tagId } = useParams<{ tagId: string }>();

  const {
    data: tag,
    loading: loadingTag,
    errors: tagErrors,
    load: reloadTag,
  } = useFetch<undefined, ITag>({
    url: `/tags/${tagId}`,
    runOnMount: true,
  });

  const {
    data: ideas,
    loading: loadingIdeas,
    errors: ideaErrors,
    load: reloadIdeas,
  } = useFetch<undefined, IIdea[]>({
    url: `/tags/${tagId}/ideas`,
    runOnMount: true,
  });

  const {
    data: relatedIdeas,
    loading: loadingRelatedIdeas,
    errors: relatedIdeaErrors,
    load: reloadRelatedIdeas,
  } = useFetch<undefined, IIdea[]>({
    url: `/tags/${tagId}/similar-ideas`,
    runOnMount: true,
  });

  const filteredRelatedIdeas = relatedIdeas
    ? relatedIdeas.filter(
        (relatedIdea) => !ideas?.some((idea) => idea.id === relatedIdea.id),
      )
    : [];

  const somethingLoading = loadingTag || loadingIdeas || loadingRelatedIdeas;

  const handleRefresh = async () => {
    await reloadTag();
    await reloadIdeas();
    await reloadRelatedIdeas();
  };

  const handleAddTag = async (idea: IIdea) => {
    if (!tag) {
      console.error("Cannot add tag: Tag data not loaded.");
      // Optionally show an error message to the user
      return;
    }
    try {
      // Assuming addTagToIdea takes ideaId and tagId (as strings)
      await addTagToIdea(idea.id.toString(), tag.id.toString());
      console.log(`Successfully added tag ${tag.name} to idea ${idea.title}`);
      handleRefresh();
    } catch (error) {
      console.error(
        `Failed to add tag ${tag.name} to idea ${idea.title}:`,
        error,
      );
      // Optionally show an error message to the user
      showNotification({
        title: "Error",
        message: "Something went wrong adding the tag",
        color: "red",
      });
    }
  };

  // Handler for a potential "Remove tag" button (not currently in the TSX)
  const handleRemoveTag = async (idea: IIdea) => {
    if (!tag) {
      console.error("Cannot remove tag: Tag data not loaded.");
      // Optionally show an error message to the user
      return;
    }
    try {
      // Assuming removeTagFromIdea takes ideaId and tagId (as strings)
      await removeTagFromIdea(idea.id.toString(), tag.id.toString());
      console.log(
        `Successfully removed tag ${tag.name} from idea ${idea.title}`,
      );
      handleRefresh();
    } catch (error) {
      console.error(
        `Failed to remove tag ${tag.name} from idea ${idea.title}:`,
        error,
      );
      showNotification({
        title: "Error",
        message: "Something went wrong removing the tag",
        color: "red",
      });
    }
  };

  const ideaIsConnected = (ideaId: string) => {
    return !!ideas?.find((i) => i.id.toString() === ideaId);
  };

  const [draggingOver, setDraggingOver] = useState(false);

  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      if (!tag) {
        return;
      }
      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData) as { ideaId: string };
      const { ideaId } = data;
      if (ideaIsConnected(ideaId)) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this idea again.",
          color: "yellow",
        });
        return;
      }
      console.log("Dropped connection id: ", ideaId);
      await addTagToIdea(ideaId, tag.id.toString());
      handleRefresh();
    } catch (error) {
      console.log("Error creating connection: ", error);
    } finally {
      setDraggingOver(false);
    }
  };

  return (
    <PageWrapper>
      <LeftSidebar>
        {!!tag && (
          <Stack gap="md">
            <Group>
              <Title order={3}>Suggested Ideas</Title>
              {loadingRelatedIdeas && <Loader size="md" />}
            </Group>
            {relatedIdeaErrors && relatedIdeaErrors.length > 0 && (
              <Alert
                icon={<WarningCircle size={24} />} // Updated icon
                title="Error!"
                color="red"
                mt="md"
              >
                Failed to load suggested ideas: {relatedIdeaErrors.join(", ")}
              </Alert>
            )}
            {!(relatedIdeaErrors && relatedIdeaErrors.length > 0) &&
            filteredRelatedIdeas &&
            filteredRelatedIdeas.length > 0 ? (
              <Stack gap="md">
                {filteredRelatedIdeas.map((idea) => (
                  <StandardIdeaCard
                    onCardClick={() => {
                      navigate(`/idea/${idea.id.toString()}`);
                    }}
                    idea={idea}
                    key={idea.id.toString()}
                    actions={[
                      {
                        icon: <Tag />,
                        id: "apply_tag",
                        label: `Apply "${tag.name}"`,
                        onClick: () => {
                          handleAddTag(idea);
                        },
                        tooltip: `Apply tag ${tag.name} to ${idea.title}`,
                      },
                    ]}
                  />
                ))}
              </Stack>
            ) : (
              !loadingRelatedIdeas &&
              !(relatedIdeaErrors && relatedIdeaErrors.length > 0) && (
                <Text c="dimmed">No similar ideas found for this tag.</Text>
              )
            )}
          </Stack>
        )}
      </LeftSidebar>
      <Container
        w="100%"
        py="xl"
        style={{ position: "relative" }}
        className={styles.viewtag}
        onDragOver={() => {
          setDraggingOver(true);
        }}
        onDragLeave={() => {
          setDraggingOver(false);
        }}
      >
        {draggingOver && (
          <Overlay
            backgroundOpacity={0}
            blur={4}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              handleConnectionDrop(e);
            }}
            radius={"lg"}
          >
            <Group align="center" justify="center" style={{ height: "100%" }}>
              <Text c="white" mx="lg" size="sm">
                Drop here to create a connection
              </Text>
            </Group>
          </Overlay>
        )}
        {!!tag && (
          <Stack gap="xl">
            <Group>
              <Link to="/tags">
                <Button variant="subtle" leftSection={<ArrowLeft />}>
                  All Tags
                </Button>
              </Link>
            </Group>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group gap="lg" mb="xs">
                <BlockTag tag={tag} color="blue" />
              </Group>
              {tag.description && (
                <Text size="sm" c="dimmed" mt="xs">
                  {tag.description}
                </Text>
              )}
              <Text size="xs" c="dimmed" mt="sm">
                Created: {new Date(tag.createdAt).toLocaleDateString()}
              </Text>
              {tag.updatedAt && tag.updatedAt !== tag.createdAt && (
                <Text size="xs" c="dimmed">
                  Last Updated: {new Date(tag.updatedAt).toLocaleDateString()}
                </Text>
              )}
            </Card>

            {/* Ideas with this Tag */}
            <Stack gap="md">
              <Group>
                <Title order={3}>Ideas with this tag</Title>
                {loadingIdeas && <Loader size="md" />}
              </Group>
              {ideaErrors && ideaErrors.length > 0 && (
                <Alert
                  icon={<WarningCircle size={24} />} // Updated icon
                  title="Error!"
                  color="red"
                  mt="md"
                >
                  Failed to load ideas for this tag: {ideaErrors.join(", ")}
                </Alert>
              )}
              {ideas && ideas.length > 0 ? (
                <SimpleGrid cols={2} spacing="lg">
                  {ideas.map((idea) => (
                    <CompactIdeaCard
                      idea={idea}
                      key={idea.id.toString()}
                      onCardClick={() => {
                        navigate(`/idea/${idea.id.toString()}`);
                      }}
                      actions={[
                        {
                          icon: <Tag />,
                          id: "remove_tag",
                          label: `Remove tag`,
                          onClick: () => {
                            handleRemoveTag(idea);
                          },
                          tooltip: `Remove tag ${tag.name} from ${idea.title}`,
                        },
                      ]}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                !loadingIdeas &&
                !(ideaErrors && ideaErrors.length > 0) && (
                  <Text c="dimmed">
                    No ideas are currently associated with this tag.
                  </Text>
                )
              )}
            </Stack>
          </Stack>
        )}
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
