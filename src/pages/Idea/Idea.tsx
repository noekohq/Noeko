import React, { useEffect, useState, useCallback, useRef } from "react"; // Import React
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
  Flex,
  Divider,
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
import { useLayout } from "../../contexts/LayoutContext";
import { getTextProcessed } from "../../utils/processing";
import { htmlToPlainText } from "../../utils/formatting";
import useBeaconOnHide from "../../hooks/useBeaconOnHide";

export default function Idea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const [idea, setIdea] = useState<IIdea | null>(null);
  const [originalIdea, setOriginalIdea] = useState<IIdea | null>(null);

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  const [isSaved, setIsSaved] = useState<boolean>(true);

  useEffect(() => {
    setIdea(null);
    setOriginalIdea(null);
    setTitle(""); // Or a loading placeholder like "Loading..."
    setContent(""); // Or a loading placeholder
    setIsSaved(true); // Assume saved or loading until new data arrives
  }, [ideaId]); // Only dependency is ideaId

  const {
    data: fetchedIdeaData,
    load: reloadIdea,
    loading: loadingIdea,
    errors: loadErrors,
  } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    dependencies: [ideaId],
    query: {
      withRelatedIdeas: "true",
      withConnections: "true",
      withDerived: "true",
    },
    method: "GET",
    runOnMount: true,
    onSuccess: (d) => {
      setIdea(d);
      setOriginalIdea(d); // Store the original state
      setTitle(d.title);
      setContent(d.content || "");
      setIsSaved(true);
    },
  });

  useEffect(() => {
    if (loadErrors && loadErrors.length > 0) {
      showNotification({
        title: "Error Loading Idea",
        message: `Could not fetch idea details: ${loadErrors[0] || "Unknown error"}`,
        color: "red",
      });
    }
  }, [loadErrors]);

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
      title: title || "New idea...",
      content: content || "Nothing here yet...",
    },
    dependencies: [title, content, ideaId],
    onSuccess: (updatedIdea) => {
      reloadIdea();
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
    if (
      isSaved ||
      loadingSaveChanges ||
      !idea
      // !idea.content ||
      // !idea.title
    ) {
      return;
    }
    triggerSaveChanges();
  }, [
    isSaved,
    loadingSaveChanges,
    idea,
    idea?.content,
    idea?.title,
    triggerSaveChanges,
    ideaId,
  ]);

  const { load: triggerDeleteIdea, loading: loadingDelete } = useFetch({
    url: `/graph/ideas/${ideaId}`,
    dependencies: [ideaId],
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
  }, [loadingDelete, triggerDeleteIdea, ideaId]);

  const { load: triggerEmbedIdea, loading: loadingEmbeddings } = useFetch({
    url: `/graph/ideas/${ideaId}/embed`,
    method: "POST",
    onSuccess: () => {
      reloadIdea();
    },
    onError: (error: any) => {
      showNotification({
        title: "Embedding Error",
        message: `Failed to start embedding generation: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  const { load: triggerDerivedCascade, loading: loadingDerivedCascade } =
    useFetch({
      url: `/graph/ideas/${ideaId}/cascade`,
      dependencies: [ideaId],
      method: "POST",
      onSuccess: () => {
        reloadIdea();
      },
      onError: (error: any) => {
        showNotification({
          title: "Error",
          message: `Failed to run some updates on idea.`,
          color: "red",
        });
      },
    });

  const embeddingsOutOfDate = useCallback(() => {
    if (!idea) return false;
    if (!idea.embeddingsUpdatedAt) return true;
    return new Date(idea.contentUpdatedAt) > new Date(idea.embeddingsUpdatedAt);
  }, [idea, ideaId]);

  const statusText = useCallback(() => {
    let text = "";
    const { wordCount, characterCount, sentenceCount } = getTextProcessed(
      htmlToPlainText(content),
    );
    if (!isSaved && content !== (originalIdea?.content || "")) {
      text += "Out of date... ";
    }
    if (loadingSaveChanges) {
      text += "Saving...";
    } else if (isSaved) {
      text += "Saved. ";
    }
    text += `${wordCount} words. `;
    text += `${characterCount} characters. `;
    text += `${sentenceCount} sentences. `;
    if (loadingEmbeddings) {
      text += "Generating embeddings... ";
    } else if (!idea?.embeddings || idea.embeddings?.length === 0) {
      text += "No embeddings generated yet. ";
    } else if (embeddingsOutOfDate()) {
      text += "Embeddings might be out of date. ";
    }
    return text.trim();
  }, [
    idea,
    ideaId,
    content,
    isSaved,
    originalIdea,
    loadingEmbeddings,
    embeddingsOutOfDate,
  ]);

  const showStatusBlock = statusText().length > 0;

  const [connectionDrawerOpened, connectionDrawerHandlers] =
    useDisclosure(false);
  const [overviewDrawerOpened, overviewDrawerHandlers] = useDisclosure(false);

  useEffect(() => {
    connectionDrawerHandlers.close();
    overviewDrawerHandlers.close();
  }, [ideaId]);

  const handleManualSaveChanges = useCallback(() => {
    handleSaveChanges();
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
          handleManualSaveChanges();
        },
      },
    ],
  });

  const {
    rightSidebar: { opened: rightSidebarOpened },
    isMobile,
  } = useLayout();

  const [toolbarStyles, setToolbarStyles] = useState<{
    left: string;
    width: string;
  }>();

  const ideaRef = useRef<HTMLDivElement>(null);

  const updateFixedStyle = useCallback(() => {
    if (isMobile) {
      return;
    }
    if (ideaRef.current) {
      const parentRect = ideaRef.current.getBoundingClientRect();

      setToolbarStyles({
        width: `${parentRect.width}px`,
        left: `${parentRect.left}px`,
      });
    }
  }, [isMobile]);

  useEffect(() => {
    const parentElement = ideaRef.current;
    if (!parentElement) {
      return;
    }

    updateFixedStyle();

    const resizeObserver = new ResizeObserver(() => {
      updateFixedStyle();
    });
    resizeObserver.observe(parentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateFixedStyle]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
    },
    [ideaId],
  );

  useEffect(() => {
    if (!originalIdea) return;
    const titleChanged = title !== originalIdea.title;
    const contentChanged = content !== (originalIdea.content || "");
    setIsSaved(!(titleChanged || contentChanged));
  }, [title, content, originalIdea]);

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const triggerComputeIfNeeded = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    if (!idea) {
      return;
    }

    if (!isSaved) {
      return;
    }

    const needsEmbedding =
      !idea.embeddingsUpdatedAt ||
      new Date(idea.contentUpdatedAt) > new Date(idea.embeddingsUpdatedAt);

    if (needsEmbedding && !loadingEmbeddings && !loadingSaveChanges) {
      triggerEmbedIdea();
    } else if (!needsEmbedding) {
    } else {
    }
    // if (!loadingDerivedCascade && !loadingSaveChanges) {
    //   triggerDerivedCascade();
    // }
  }, [
    idea,
    ideaId,
    isSaved,
    loadingEmbeddings,
    loadingDerivedCascade,
    loadingSaveChanges,
    triggerEmbedIdea,
    embeddingsOutOfDate,
  ]);

  const handleEditorBlur = useCallback(
    (content: string) => {
      triggerComputeIfNeeded();
    },
    [triggerComputeIfNeeded, ideaId],
  );

  const titleDebounceTimeoutRef = useRef<Timer | null>(null); // Ref to hold timeout ID

  useEffect(() => {
    if (
      idea &&
      idea.id.toString() === ideaId &&
      originalIdea &&
      originalIdea.id.toString() === ideaId &&
      title !== originalIdea.title && // Actual change from fetched original
      !loadingIdea && // Not currently loading the main idea data
      !loadingSaveChanges // Not already saving
    ) {
      console.log(
        `Title changed from "${originalIdea.title}" to "${title}" for idea ${ideaId}. Triggering save.`,
      );
      triggerSaveChanges();
    }
  }, [
    title,
    originalIdea,
    idea,
    ideaId,
    loadingIdea,
    triggerSaveChanges,
    loadingSaveChanges,
  ]); // Add ALL relevant dependencies

  const getDataForBeacon = () => {
    if (!idea) {
      return null;
    }
    return {
      content,
      title,
      withComputations: true,
    };
  };

  useBeaconOnHide({
    url: `/graph/ideas/update/${ideaId}`,
    getData: getDataForBeacon,
    isEnabled: true,
    event: "pagehide",
  });

  return (
    <PageWrapper>
      <LeftSidebar>
        {idea && (
          <>
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
            <Divider my="lg" />
            <Connections
              opened={connectionDrawerOpened}
              onClose={connectionDrawerHandlers.close}
              loadingIdea={loadingIdea}
              idea={idea}
              reloadIdea={reloadIdea}
            />
            <Divider my="lg" />
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
      <div className={styles.idea} ref={ideaRef}>
        {/* {loadingIdea && <Loading size="md" />} */}
        {idea && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12 }}>
                <Title
                  order={1}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    setTitle(e.currentTarget.innerText);
                  }}
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
                <DreamWriter
                  key={ideaId}
                  initialContent={idea.content || ""}
                  stickyMenu={false}
                  onChange={handleContentChange}
                  onDebounce={handleSaveChanges}
                  debounce={1000}
                  onBlur={handleEditorBlur}
                />
              </Grid.Col>
            </Grid>
            {showStatusBlock && (
              <div
                className={`${styles.toolbar} ${rightSidebarOpened ? styles.rightSidebarOpen : ""}`}
                style={{
                  width:
                    toolbarStyles && !isMobile
                      ? toolbarStyles.width
                      : undefined,
                  left:
                    toolbarStyles && !isMobile ? toolbarStyles.left : undefined,
                }}
              >
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    {statusText()}
                  </Text>
                </Group>
              </div>
            )}
          </>
        )}
      </div>
      <RightSidebar stayCollapsed={isMobile}>
        <Flex
          direction={
            isMobile
              ? rightSidebarOpened
                ? "row"
                : "row"
              : rightSidebarOpened
                ? "row"
                : "column"
          }
          align={"center"}
          wrap={"wrap"}
          gap="md"
        >
          <Tooltip label="Delete Idea">
            <ActionIcon
              variant="light"
              color="red"
              size="lg"
              onClick={handleDeleteIdea}
              disabled={loadingDelete}
            >
              {loadingDelete ? <Loader size="xs" /> : <TrashSimple />}
            </ActionIcon>
          </Tooltip>
        </Flex>
      </RightSidebar>
    </PageWrapper>
  );
}
