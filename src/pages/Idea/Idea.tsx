import { useEffect, useState, useCallback, useRef } from "react"; // Import React
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import { useDebouncedCallback } from "@mantine/hooks";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { IIdea, ISafeIdea } from "../../../app/database/models/ideas";
import { Editor as IEditor } from "@tiptap/react";
import {
  ActionIcon,
  Grid,
  Group,
  Title,
  Loader,
  Text,
  Card,
  Tooltip,
  Divider,
  Flex,
  Menu,
  CopyButton,
  Stack,
  Space,
  Button,
} from "@mantine/core";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import { modals } from "@mantine/modals";
import {
  BookOpenIcon,
  BracketsAngleIcon,
  CheckIcon,
  CopySimpleIcon,
  CursorTextIcon,
  EyeIcon,
  MarkdownLogoIcon,
  SparkleIcon,
  StarIcon,
  TagIcon,
  TrashSimpleIcon,
  UserCirclePlusIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import Connections from "./Connections";
import Insights from "./Insights";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { useLayout } from "../../contexts/LayoutContext";
import { getTextProcessed } from "../../utils/processing";
import { htmlToPlainText } from "../../utils/formatting";
import { IdeaProvider } from "../../contexts/IdeaContext";
import { api } from "../../server/api";
import TagsManager from "./TagsManager";
import { downloadTextAsFile } from "../../utils/files";
import { htmlToMarkdown } from "../../../app/utils/formatting";
import Content from "../../components/UI/Layout/Content";
import Search from "../../components/Search/Search";
import Access from "./Access";
import Loading from "../../components/Display/Loading/Loading";

import { Alert } from "@mantine/core";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { useMultiTabWarning } from "../../hooks/useMultiTabWarning";
import { useLandscape } from "../../contexts/LandscapeContext";
import { createIdeaConnection } from "../../utils/ideas";
import { ideasAreConnected } from "../../utils/graph";
import StatusBar from "../../components/UI/Layout/Bottom";
import StatusButton from "../../components/Display/Interactions/StatusButton";

export default function Idea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const isDuplicateTab = useMultiTabWarning(ideaId);
  const [overrideDuplicateTab, setOverrideDuplicateTab] = useState(false);
  const editingDisabled = isDuplicateTab && !overrideDuplicateTab;
  const [title, setTitle] = useState<string>("");
  const [loadingSaveChanges, setLoadingSaveChanges] = useState(false);
  const [originalIdea, setOriginalIdea] = useState<ISafeIdea>();

  const {
    elements: {
      statusBar: {
        message: { set: setStatusMessage },
      },
    },
    isMobile,
  } = useLayout();

  useDocumentTitle(`${title || "Loading..."} - Qwest`);

  const {
    data: idea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<undefined, ISafeIdea>({
    url: `/ideas/${ideaId}`,
    dependencies: [ideaId],
    query: {
      withDerived: "true",
    },
    method: "GET",
    runOnMount: true,
    onSuccess: (d) => {
      setTitle(d.title);
      setOriginalIdea(d);
    },
  });

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
      console.error("Error deleting idea: ", error);
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
    url: `/ideas/${ideaId}/embed`,
    method: "POST",
    onSuccess: () => {},
    onError: (error: any) => {
      console.error("Error generating embeddings: ", error);
    },
    onFinally: () => {
      reloadIdea();
    },
  });

  const { load: triggerDerivedCascade, loading: loadingDerivedCascade } =
    useFetch({
      url: `/ideas/${ideaId}/cascade`,
      dependencies: [ideaId],
      method: "POST",
      onSuccess: () => {},
      onError: (error: any) => {
        console.error("Error generating derived cascade: ", error);
      },
      onFinally: () => {
        reloadIdea();
      },
    });

  const { load: triggerTitleGeneration, loading: loadingTitleGeneration } =
    useFetch({
      url: `/ideas/${ideaId}/entitle`,
      dependencies: [ideaId],
      method: "POST",
      onSuccess: () => {},
      onError: (error: any) => {
        console.error("Error generating title: ", error);
      },
      onFinally: () => {
        reloadIdea();
      },
    });

  const {
    idea: {
      viewing: { set: setViewing },
    },
  } = useLandscape();

  useEffect(() => {
    if (idea) {
      setViewing(idea);
    }

    return () => {
      setViewing(null);
    };
  }, [idea]);

  const embeddingsOutOfDate = useCallback(() => {
    if (!idea) {
      return false;
    }
    if (!idea.embeddingsUpdatedAt) {
      return true;
    }
    return new Date(idea.contentUpdatedAt) > new Date(idea.embeddingsUpdatedAt);
  }, [ideaId, idea]);

  const derivedOutOfDate = useCallback(() => {
    if (!idea) {
      return false;
    }
    if (
      !idea.derived?.generative_summary ||
      !idea.derived.generative_summary.createdAt
    ) {
      return true;
    }
    return (
      new Date(idea.contentUpdatedAt) >
      new Date(idea.derived.generative_summary.createdAt)
    );
  }, [ideaId, idea]);

  const titleNeedsGeneration = useCallback(() => {
    if (!idea) {
      return false;
    }
    const cleanTitle = idea.title.replaceAll(/_/g, "").replaceAll(/\n/g, "");
    if (!cleanTitle || cleanTitle === "Untitled Idea") {
      return true;
    }
    return false;
  }, [ideaId, idea]);

  const statusText = useCallback(() => {
    let text = "";
    if (!idea) {
      return "Still loading...";
    }
    const { wordCount, characterCount, sentenceCount } = getTextProcessed(
      htmlToPlainText(idea.content),
    );
    if (loadingSaveChanges) {
      text += "Saving...";
    } else {
      text += "Saved. ";
    }
    text += `${wordCount} word${characterCount === 1 ? "" : "s"}. `;
    text += `${characterCount} character${characterCount === 1 ? "" : "s"}. `;
    text += `${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"}. `;
    if (loadingEmbeddings) {
      text += "Indexing... ";
    }
    return text.trim();
  }, [idea, ideaId, loadingEmbeddings, embeddingsOutOfDate]);

  useEffect(() => {
    if (statusText()) {
      setStatusMessage(statusText());
    }

    return () => {
      setStatusMessage("");
    };
  }, [statusText()]);

  const updateContent = async (newContent: string) => {
    setLoadingSaveChanges(true);
    await api
      .put(`/ideas/${ideaId}`, {
        content: newContent,
      })
      .then(() => {
        reloadIdea();
      })
      .catch((error) => {
        if (error.response.status === 413) {
          showNotification({
            title: "Error",
            message: "Content is too large",
          });
          return;
        }
        showNotification({
          title: "Error",
          message: "Something went wrong saving the content",
        });
      })
      .finally(() => {
        setLoadingSaveChanges(false);
      });
  };

  const updateTitle = async (newTitle: string) => {
    setLoadingSaveChanges(true);
    await api
      .put(`/ideas/${ideaId}`, {
        title: newTitle,
      })
      .then(() => {
        reloadIdea();
      })
      .finally(() => {
        setLoadingSaveChanges(false);
      });
  };
  const debouncedUpdateContent = useDebouncedCallback(updateContent, 500);
  const debouncedUpdateTitle = useDebouncedCallback(updateTitle, 500);

  const handleContentChange = useCallback(
    (newContent: string) => {
      debouncedUpdateContent(newContent);
    },
    [ideaId],
  );

  useEffect(() => {
    if (title && originalIdea?.title !== title) {
      debouncedUpdateTitle(title);
    }
  }, [title]);

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const triggerComputeIfNeeded = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    if (embeddingsOutOfDate() && !loadingEmbeddings) {
      triggerEmbedIdea();
    }
    if (derivedOutOfDate() && !loadingDerivedCascade) {
      triggerDerivedCascade();
    }
    if (titleNeedsGeneration() && !loadingTitleGeneration) {
      triggerTitleGeneration();
    }
  }, [
    idea,
    ideaId,
    loadingEmbeddings,
    loadingDerivedCascade,
    embeddingsOutOfDate,
    derivedOutOfDate,
  ]);

  useEffect(() => {
    return () => {
      triggerComputeIfNeeded();
    };
  }, []);

  const [editorContent, setEditorContent] = useState<string>();
  const currentIdeaId = useRef(idea?.id);
  useEffect(() => {
    const idChanged = currentIdeaId.current !== idea?.id;
    if (idChanged && idea) {
      currentIdeaId.current = idea.id;
      setEditorContent(idea.content);
    }

    return () => {
      setEditorContent(undefined);
    };
  }, [idea?.id]);

  const handleEditorBlur = useCallback(async () => {
    await triggerComputeIfNeeded();
  }, [ideaId, idea]);

  const [searchParams, setSearchParams] = useSearchParams();
  const highlightText = searchParams.get("highlightText");
  const handleContentReady = useCallback(() => {
    if (highlightText) {
      window.location.hash = highlightText;
    }
  }, [highlightText]);

  const editorRef = useRef<IEditor>();

  const downloadAsHTML = () => {
    if (idea?.content) {
      downloadTextAsFile(idea?.content, {
        type: "text/html",
        extension: "html",
        name: idea.title,
      });
    }
  };

  const getMarkdownContent = () => {
    if (!idea?.content) {
      return "";
    }
    if (editorRef.current?.storage.markdown) {
      return editorRef.current?.storage.markdown.getMarkdown() as string;
    }
    return htmlToMarkdown(idea?.content);
  };

  const downloadAsMarkdown = () => {
    if (idea?.content && editorRef.current) {
      const markdown = getMarkdownContent();

      downloadTextAsFile(markdown, {
        type: "text/markdown",
        extension: "md",
        name: idea.title,
      });
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (loadingSaveChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    if (loadingSaveChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [loadingSaveChanges]);

  const handleConnectIdea = async (ideaId: string) => {
    try {
      if (!ideaId || !idea) {
        return;
      }
      await createIdeaConnection(idea.id.toString(), ideaId);
      reloadIdea();
    } catch (error) {
      console.error("Error creating idea connection: ", error);
      showNotification({
        message: "Something went wrong creating the connection",
      });
    }
  };

  const isConnected = useCallback(
    (ideaId: string) => {
      if (!idea) {
        return false;
      }
      return ideasAreConnected(idea, ideaId);
    },
    [ideaId, idea],
  );

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>
          <Tabs defaultValue="context">
            <Tabs.List>
              <Tabs.Tab value="context">
                <Group gap="xs">
                  <StarIcon weight="fill" size={14} />
                  Context
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="insights">
                <Group gap="xs">
                  <EyeIcon weight="bold" />
                  Insights
                </Group>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="context">
              <Card radius="md" withBorder shadow="xs" p="md">
                <Text fw={"bold"} c="dimmed" size="sm" mb={4}>
                  The Gist
                </Text>
                <Text size="sm">
                  {idea?.derived?.generative_summary?.sentenceSummary ||
                    idea?.derived?.generative_summary?.sentenceOverview || (
                      <Text span c="dimmed" fs="italic">
                        No overview available.
                      </Text>
                    )}
                </Text>
              </Card>
              {!!idea && (
                <>
                  <Space my="lg" />
                  <Stack>
                    <Text size="sm" fw="bold" c="dimmed">
                      <Group gap="xs">
                        <TagIcon weight="fill" />
                        TAGS
                      </Group>
                    </Text>
                    <TagsManager maxSuggested={2} idea={idea} />
                  </Stack>
                  <Space my="lg" />
                  <Connections
                    loadingIdea={loadingIdea}
                    idea={idea}
                    reloadIdea={reloadIdea}
                    computeOutOfDate={embeddingsOutOfDate()}
                    triggerCompute={triggerComputeIfNeeded}
                    computing={loadingEmbeddings || loadingDerivedCascade}
                  />
                </>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="insights">
              <Insights
                loadingIdea={loadingIdea}
                idea={idea}
                reloadIdea={reloadIdea}
              />
            </Tabs.Panel>
          </Tabs>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        {editingDisabled && (
          <Alert
            variant="light"
            color="orange"
            title="Editing in multiple tabs is not supported"
            icon={<WarningCircleIcon />}
            mb="md"
          >
            <Group justify="space-between">
              <Text>
                To avoid losing your work, please close this tab and continue
                editing in the original one.
              </Text>
              <Button
                variant="light"
                color="orange"
                onClick={() => setOverrideDuplicateTab(true)}
              >
                Edit Anyway
              </Button>
            </Group>
          </Alert>
        )}
        <div className={styles.ideaContainer}>
          <Stack gap="md">
            <Group>
              <Title
                order={1}
                m="0"
                pr="md"
                contentEditable={!editingDisabled}
                suppressContentEditableWarning
                onBlur={(e) => {
                  updateTitle(e.currentTarget.innerText);
                }}
                dangerouslySetInnerHTML={{ __html: title || "" }}
                className={styles.editableTitle}
              />
              {idea?.titleGeneratedAt && (
                <div
                  className={styles.generatedIndicator}
                  title={"This title was generated automatically."}
                >
                  <SparkleIcon />
                </div>
              )}
              {loadingTitleGeneration && (
                <div className={styles.loadingIndicator}>
                  <Loader size="xs" color="gray" />
                </div>
              )}
            </Group>
            <div className={styles.contentArea}>
              {idea && (
                <IdeaProvider
                  idea={idea}
                  reloadIdea={async () => {
                    await reloadIdea();
                  }}
                >
                  <DreamWriter
                    key={ideaId}
                    initialContent={editorContent}
                    stickyMenu={false}
                    onChange={handleContentChange}
                    onBlur={handleEditorBlur}
                    onContentReady={handleContentReady}
                    dependencies={[ideaId, idea.id]}
                    ref={editorRef}
                    readOnly={editingDisabled}
                  />
                </IdeaProvider>
              )}
            </div>
          </Stack>
        </div>
      </Content>
      <StatusBar>
        <StatusBar.Showing>
          <StatusBar.Item>
            <StatusButton>
              <Text c="gray" size="xs">
                {statusText()}
              </Text>
            </StatusButton>
          </StatusBar.Item>
        </StatusBar.Showing>
      </StatusBar>
      <RightSidebar>
        <RightSidebar.Open>
          <Tabs defaultValue="tools">
            <Tabs.List>
              <Tabs.Tab value="tools">
                <Group gap="xs">
                  <WrenchIcon weight="fill" size={14} />
                  Tools
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="access">
                <Group gap="xs">
                  <UserCirclePlusIcon weight="fill" size={14} />
                  Access
                </Group>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="tools">
              <Flex gap="sm" justify="flex-start">
                <Tooltip label="Delete Idea">
                  <ActionIcon
                    variant="light"
                    color="red"
                    size="sm"
                    onClick={handleDeleteIdea}
                    disabled={loadingDelete}
                  >
                    {loadingDelete ? <Loader size="xs" /> : <TrashSimpleIcon />}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Viewonly">
                  <Link to="view">
                    <ActionIcon variant="light" size="sm" color="gray">
                      <BookOpenIcon />
                    </ActionIcon>
                  </Link>
                </Tooltip>
                <Tooltip label="Export as HTML">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    color="gray"
                    onClick={downloadAsHTML}
                  >
                    <BracketsAngleIcon />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Export as Markdown">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    color="gray"
                    onClick={downloadAsMarkdown}
                  >
                    <MarkdownLogoIcon />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Copy">
                  <Menu trigger="hover">
                    <Menu.Target>
                      <ActionIcon variant="light" size="sm" color="gray">
                        <CopySimpleIcon />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <CopyButton value={getMarkdownContent()}>
                        {({ copied, copy }) => {
                          return (
                            <Menu.Item
                              leftSection={
                                copied ? <CheckIcon /> : <MarkdownLogoIcon />
                              }
                              onClick={copy}
                            >
                              Copy as Markdown
                            </Menu.Item>
                          );
                        }}
                      </CopyButton>
                      {idea?.content && (
                        <CopyButton value={htmlToPlainText(idea?.content)}>
                          {({ copied, copy }) => {
                            return (
                              <Menu.Item
                                leftSection={
                                  copied ? <CheckIcon /> : <CursorTextIcon />
                                }
                                onClick={copy}
                              >
                                Copy as Text
                              </Menu.Item>
                            );
                          }}
                        </CopyButton>
                      )}
                      {idea?.content && (
                        <CopyButton value={idea?.content}>
                          {({ copied, copy }) => {
                            return (
                              <Menu.Item
                                leftSection={
                                  copied ? <CheckIcon /> : <CursorTextIcon />
                                }
                                onClick={copy}
                              >
                                Copy as HTML
                              </Menu.Item>
                            );
                          }}
                        </CopyButton>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Tooltip>
              </Flex>
              <Space my="lg" />
              <Search
                resultActions={
                  isMobile
                    ? [
                        (idea) => {
                          return {
                            id: "connect",
                            label: "Connect",
                            onClick: () => {
                              handleConnectIdea(idea.id.toString());
                            },
                            disabled: isConnected(idea.id.toString()),
                          };
                        },
                      ]
                    : undefined
                }
              />
            </Tabs.Panel>
            <Tabs.Panel value="access">
              {!!idea && (
                <Access
                  idea={idea}
                  loadingIdea={loadingIdea}
                  reloadIdea={reloadIdea}
                />
              )}
              {!idea && <Loading size="sm" />}
            </Tabs.Panel>
          </Tabs>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
