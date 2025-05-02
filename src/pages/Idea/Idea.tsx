import React, { useEffect, useState, useCallback } from "react"; // Import React
import { useNavigate, useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch"; // Your custom hook
import { IIdea, IIdeaForm } from "../../../app/database/models/ideas";
import {
  ActionIcon,
  Button,
  Grid,
  Group,
  Title,
  Loader,
  Text,
  Card,
  Space,
  Tooltip,
  Kbd,
  Box,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  ArrowLeft,
  FloppyDisk, // Save icon
  ListMagnifyingGlass,
  Shapes,
  Sparkle,
  TrashSimple,
  TreeStructure,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import Connections from "./Connections";
import Overview from "./Overview";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import useShortcuts from "../../hooks/useShortcuts";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import Loading from "../../components/Display/Loading/Loading";

export default function Idea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const [idea, setIdea] = useState<IIdea | null>(null);
  const [originalIdea, setOriginalIdea] = useState<IIdea | null>(null);

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  const [isSaved, setIsSaved] = useState<boolean>(true);

  const {
    data: fetchedIdeaData,
    load: reloadIdea,
    loading: loadingIdea,
    errors: loadErrors,
  } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    query: {
      withRelatedIdeas: "true",
      withConnections: "true",
      withDerived: "true",
    },
    method: "GET",
    runOnMount: true,
  });

  useEffect(() => {
    if (fetchedIdeaData) {
      setIdea(fetchedIdeaData);
      setOriginalIdea(fetchedIdeaData); // Store the original state
      setTitle(fetchedIdeaData.title);
      setContent(fetchedIdeaData.content || "");
      setIsSaved(true);
    }
  }, [fetchedIdeaData]);

  useEffect(() => {
    if (loadErrors && loadErrors.length > 0) {
      showNotification({
        title: "Error Loading Idea",
        message: `Could not fetch idea details: ${loadErrors[0] || "Unknown error"}`,
        color: "red",
      });
    }
  }, [loadErrors]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  useEffect(() => {
    if (!originalIdea) return;

    const titleChanged = title !== originalIdea.title;
    const contentChanged = content !== (originalIdea.content || "");

    setIsSaved(!(titleChanged || contentChanged));
  }, [title, content, originalIdea]);

  const { load: triggerSaveChanges, loading: loadingSaveChanges } = useFetch<
    Partial<IIdeaForm>,
    IIdea
  >({
    url: `/graph/ideas/${ideaId}`,
    method: "PUT",
    body: {
      title: title,
      content: content,
    },
    dependencies: [title, content],
    onSuccess: (updatedIdea) => {
      reloadIdea();
      showNotification({
        title: "Success",
        message: "Idea updated successfully",
      });
    },
    onError: (error: any) => {
      showNotification({
        title: "Error Saving",
        message: `There was an error updating the idea: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  const handleSaveChanges = useCallback(() => {
    if (isSaved || loadingSaveChanges || !idea) return;
    triggerSaveChanges();
  }, [isSaved, loadingSaveChanges, idea, triggerSaveChanges]);

  const { load: triggerDeleteIdea, loading: loadingDelete } = useFetch({
    url: `/graph/ideas/${ideaId}`,
    method: "DELETE",
    onSuccess: () => {
      navigate("/");
      showNotification({
        title: "Success",
        message: "Idea deleted successfully",
      });
    },
    onError: (error: any) => {
      showNotification({
        title: "Error Deleting",
        message: `There was an error deleting the idea: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  const handleDeleteIdea = useCallback(() => {
    if (loadingDelete) return;
    modals.openConfirmModal({
      title: "Are you sure you want to delete this idea?",
      centered: true,
      children: (
        <Text size="sm">
          This action cannot be undone. All associated data will be lost.
        </Text>
      ),
      labels: { confirm: "Delete Idea", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => triggerDeleteIdea(),
    });
  }, [loadingDelete, triggerDeleteIdea]);

  const { load: triggerEmbedIdea, loading: loadingEmbeddings } = useFetch({
    url: `/graph/ideas/${ideaId}/embed`,
    method: "POST",
    onSuccess: () => {
      reloadIdea();
      showNotification({
        title: "Embeddings",
        message: "Embedding generation process started.", // Message suggests async process
      });
    },
    onError: (error: any) => {
      showNotification({
        title: "Embedding Error",
        message: `Failed to start embedding generation: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  const handleEmbedIdea = useCallback(() => {
    if (loadingEmbeddings || loadingSaveChanges || !idea) return;
    if (!isSaved) {
      showNotification({
        title: "Unsaved Changes",
        message: "Please save your changes before generating embeddings.",
        color: "yellow",
      });
      return;
    }
    triggerEmbedIdea();
  }, [isSaved, loadingEmbeddings, loadingSaveChanges, idea, triggerEmbedIdea]);

  const embeddingsOutOfDate = useCallback(() => {
    if (!idea) return false;
    if (!idea.embeddingsUpdatedAt) return true;
    return new Date(idea.contentUpdatedAt) > new Date(idea.embeddingsUpdatedAt);
  }, [idea]);

  const statusText = useCallback(() => {
    let text = "";
    if (loadingEmbeddings) {
      text += "Generating embeddings... ";
    } else if (!idea?.embeddings || idea.embeddings?.length === 0) {
      text += "No embeddings generated yet. ";
    } else if (embeddingsOutOfDate()) {
      text += "Embeddings might be out of date. ";
    }
    return text.trim();
  }, [idea, loadingEmbeddings, embeddingsOutOfDate]);

  const showStatusBlock = statusText().length > 0 || loadingEmbeddings;
  const showEmbedButton = embeddingsOutOfDate();

  const [connectionDrawerOpened, connectionDrawerHandlers] =
    useDisclosure(false);
  const [overviewDrawerOpened, overviewDrawerHandlers] = useDisclosure(false);

  useEffect(() => {
    connectionDrawerHandlers.close();
    overviewDrawerHandlers.close();
  }, [ideaId]);

  useShortcuts({
    shortcuts: [
      {
        keys: {
          meta: true,
          key: "i",
        },
        run: () => {
          connectionDrawerHandlers.toggle();
          overviewDrawerHandlers.close();
        },
      },
      {
        keys: {
          meta: true,
          key: "o",
        },
        run: () => {
          overviewDrawerHandlers.toggle();
          connectionDrawerHandlers.close();
        },
      },
      {
        keys: {
          meta: true,
          key: "s",
        },
        run: () => {
          handleSaveChanges();
        },
      },
    ],
  });

  return (
    <PageWrapper>
      <LeftSidebar>
        {idea && (
          <>
            <Connections
              opened={connectionDrawerOpened}
              onClose={connectionDrawerHandlers.close}
              loadingIdea={loadingIdea}
              idea={idea}
              reloadIdea={reloadIdea}
            />
            <Overview
              opened={overviewDrawerOpened}
              onClose={overviewDrawerHandlers.close}
              loadingIdea={loadingIdea}
              idea={idea}
              reloadIdea={reloadIdea}
            />
          </>
        )}
      </LeftSidebar>
      <div className={styles.idea}>
        {loadingIdea && <Loading size="md" />}
        {idea && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12 }}>
                <Group gap="sm">
                  <Tooltip
                    label={
                      isSaved ? "No changes to save" : "Save changes (Ctrl+S)"
                    }
                  >
                    <Box>
                      <Button
                        leftSection={
                          loadingSaveChanges ? (
                            <Loader size="xs" color="white" />
                          ) : (
                            <FloppyDisk size={18} />
                          )
                        }
                        onClick={handleSaveChanges}
                        disabled={isSaved || loadingSaveChanges}
                        variant="filled"
                        size="sm" // Consistent size
                      >
                        Save
                      </Button>
                    </Box>
                  </Tooltip>

                  <Box
                    style={{
                      borderLeft: "1px solid var(--mantine-color-gray-3)",
                      height: "24px",
                      alignSelf: "center",
                    }}
                    mx="xs"
                  />

                  <Tooltip label="Connections (Ctrl+I)">
                    <ActionIcon
                      onClick={connectionDrawerHandlers.toggle}
                      variant="light"
                      size="lg"
                      aria-label="Open connections"
                    >
                      <TreeStructure size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Overview (Ctrl+O)">
                    <ActionIcon
                      onClick={overviewDrawerHandlers.toggle}
                      variant="light"
                      size="lg"
                      aria-label="Open overview"
                    >
                      <ListMagnifyingGlass size={18} />
                    </ActionIcon>
                  </Tooltip>

                  {/* Visual Separator */}
                  <Box
                    style={{
                      borderLeft: "1px solid var(--mantine-color-gray-3)",
                      height: "24px",
                      alignSelf: "center",
                    }}
                    mx="xs"
                  />

                  <Tooltip label="Delete Idea">
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="lg"
                      onClick={handleDeleteIdea}
                      disabled={loadingDelete}
                      aria-label="Delete idea"
                    >
                      {loadingDelete ? (
                        <Loader size="xs" />
                      ) : (
                        <TrashSimple size={18} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Grid.Col>

              <Grid.Col span={{ base: 12 }}>
                <Space h="lg" />
              </Grid.Col>

              <Grid.Col span={{ base: 12 }}>
                <Title
                  order={1}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTitleChange(e.currentTarget.innerText)}
                  dangerouslySetInnerHTML={{ __html: title || "" }}
                  className={styles.editableTitle} // Add custom style for focus/blur
                />
                {!isSaved && title !== originalIdea?.title && (
                  <Text size="xs" c="orange.7" mt={4}>
                    Title has unsaved changes.
                  </Text>
                )}
              </Grid.Col>

              <Grid.Col span={{ base: 12 }}>
                <Card radius="md" withBorder shadow="xs" p="md">
                  <Text fw={500} c="dimmed" size="sm" mb={4}>
                    <Sparkle
                      weight="bold"
                      style={{
                        verticalAlign: "middle",
                        marginRight: "6px",
                        fontSize: "1.1em",
                      }}
                    />
                    Content Overview
                  </Text>
                  <Text size="sm" lineClamp={3}>
                    {idea.derived?.generative_summary?.sentenceSummary ||
                      idea.derived?.generative_summary?.sentenceOverview || (
                        <Text span c="dimmed" fs="italic">
                          No overview available.
                        </Text>
                      )}
                  </Text>
                </Card>
              </Grid.Col>

              {showStatusBlock && (
                <Grid.Col span={{ base: 12 }}>
                  <Card p="lg" radius="md" withBorder shadow="xs">
                    <Group justify="space-between" align="center">
                      <Text size="sm" c="dimmed">
                        {statusText()}
                      </Text>
                      {showEmbedButton && (
                        <Button
                          leftSection={
                            loadingEmbeddings ? (
                              <Loader size="sm" />
                            ) : (
                              <Shapes weight="bold" size={16} />
                            )
                          }
                          disabled={
                            loadingEmbeddings || loadingSaveChanges || !isSaved
                          }
                          onClick={handleEmbedIdea}
                          variant="light"
                          size="xs" // Smaller button for this context
                        >
                          Generate Embeddings
                        </Button>
                      )}
                    </Group>
                  </Card>
                </Grid.Col>
              )}

              {!isSaved && content !== (originalIdea?.content || "") && (
                <Grid.Col span={{ sm: 12 }}>
                  <Text size="xs" c="orange.7" mt={4}>
                    Content has unsaved changes.
                  </Text>
                </Grid.Col>
              )}
              <Grid.Col span={{ base: 12 }}>
                <Space h="md" />
                <DreamWriter
                  key={ideaId}
                  initialContent={idea.content || ""}
                  stickyMenu={true}
                  onChange={handleContentChange}
                />
              </Grid.Col>
            </Grid>
          </>
        )}
      </div>
      <RightSidebar />
    </PageWrapper>
  );
}
