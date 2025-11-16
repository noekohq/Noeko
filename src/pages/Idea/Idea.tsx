import { useEffect, useState, useCallback, useRef } from "react"; // Import React
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import { useDebouncedCallback } from "@mantine/hooks";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { IIdea, ISafeIdea } from "../../../app/database/models/ideas";
import { generateJSON, Editor as IEditor } from "@tiptap/react";
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
  Popover,
  Box,
} from "@mantine/core";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import { modals } from "@mantine/modals";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  BracketsAngleIcon,
  CheckIcon,
  ClockIcon,
  CursorTextIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  EyeIcon,
  IntersectSquareIcon,
  MagnifyingGlassIcon,
  MarkdownLogoIcon,
  PencilSimpleIcon,
  PushPinIcon,
  SparkleIcon,
  TagIcon,
  TrashSimpleIcon,
  UniteSquareIcon,
  UserCirclePlusIcon,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import Insights from "./Insights";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { useLayout } from "../../contexts/LayoutContext";
import { getTextProcessed } from "../../utils/processing";
import { formatDateTime, htmlToPlainText } from "../../utils/formatting";
import { IdeaProvider } from "../../contexts/IdeaContext";
import { api } from "../../server/api";
import TagsManager from "../../components/Display/Interactions/Tags/TagsManager";
import { downloadTextAsFile } from "../../utils/files";
import { htmlToMarkdown } from "../../../app/utils/formatting";
import Content from "../../components/UI/Layout/Content";
import Search from "../../components/Search/Search";
import Access from "./Access";
import Loading from "../../components/Display/Loading/Loading";

import { useLandscape } from "../../contexts/LandscapeContext";
import ConnectionManager from "../../components/Display/Interactions/Connections/ConnectionManager";
import useConnectable from "../../hooks/useConnectable";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";
import usePins from "../../hooks/usePins";
import PaperDrawer from "../../components/Display/Paper/PaperDrawer";
import UnderConstruction from "../../components/Utils/UnderConstruction";

export default function Idea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState<string>("");
  const [originalIdea, setOriginalIdea] = useState<ISafeIdea>();

  const {
    elements: {
      statusBar: {
        message: { set: setStatusMessage },
      },
    },
    isMobile,
    isDesktop,
  } = useLayout();

  useDocumentTitle(`${title || "Loading..."} - Noeko`);

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
    connectable: {
      viewing: { set: setViewing },
    },
  } = useLandscape();

  useEffect(() => {
    if (idea) {
      setViewing({
        ...idea,
        type: "idea",
      });
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
    text += "Saved. ";
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

  const updateTitle = async (newTitle: string) => {
    await api
      .put(`/ideas/${ideaId}`, {
        title: newTitle,
      })
      .then(() => {
        reloadIdea();
      });
  };
  const debouncedUpdateTitle = useDebouncedCallback(updateTitle, 500);

  useEffect(() => {
    if (title && originalIdea?.title !== title) {
      debouncedUpdateTitle(title);
    }
  }, [title, originalIdea]);

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

  const editorRef = useRef<IEditor>(null);

  const { connect, isConnected } = useConnectable({
    connectable: idea ? { ...idea, type: "idea" } : null,
  });

  const handleTitleGen = () => {
    triggerTitleGeneration();
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar startOpened={isDesktop}>
        <LeftSidebar.Open>
          <Tabs defaultValue="context">
            <Tabs.List>
              <Tabs.Tab value="context">
                <Group gap="xs">
                  <IntersectSquareIcon weight="fill" size={14} />
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
              {!!idea?.derived?.generative_summary && (
                <Card
                  radius="lg"
                  p={"sm"}
                  styles={{
                    root: {
                      backgroundColor: "var(--mantine-color-dark-8) !important",
                      border: "1px solid var(--mantine-color-dark-7)",
                    },
                  }}
                >
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
              )}
              {!!idea && (
                <>
                  <ConnectionManager
                    connectable={{
                      ...idea,
                      type: "idea",
                    }}
                  />
                  <Space my="lg" />
                  {/*<Connections
                    loadingIdea={loadingIdea}
                    idea={idea}
                    reloadIdea={reloadIdea}
                    computeOutOfDate={embeddingsOutOfDate()}
                    triggerCompute={triggerComputeIfNeeded}
                    computing={loadingEmbeddings || loadingDerivedCascade}
                  />*/}
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
        <div className={styles.ideaContainer}>
          <Stack gap="md">
            <Stack>
              {idea && editorRef.current && (
                <Tools editor={editorRef.current} idea={idea} />
              )}
              <Group gap="xs">
                <Title
                  order={1}
                  m="0"
                  pr="md"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newTitle = e.currentTarget.innerText;
                    if (newTitle !== title) {
                      setTitle(newTitle);
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: title || "" }}
                  className={styles.editableTitle}
                />
                {titleNeedsGeneration() && !loadingTitleGeneration && (
                  <ActionIcon
                    onClick={() => {
                      handleTitleGen();
                    }}
                    variant="light"
                    size="sm"
                    color="gray"
                  >
                    <SparkleIcon />
                  </ActionIcon>
                )}
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
              <Box
                bg="dark.9"
                c="dark.1"
                style={{
                  borderRadius: "var(--mantine-radius-md)",
                }}
              >
                <Flex gap="xs" direction={isMobile ? "column" : "row"}>
                  <Group gap="8px">
                    <Text size="xs" title="Created at" c="dark.3" fw="565">
                      <Group gap="4px" align="center">
                        <ClockIcon weight="bold" />
                        CREATED{" "}
                      </Group>
                    </Text>
                    <Text size="xs" fw="500">
                      {idea?.createdAt
                        ? `${formatDateTime(idea?.createdAt)}`
                        : ""}
                    </Text>
                  </Group>
                  {!isMobile && (
                    <Text size="sm" fw="bold" c="dark.4">
                      •
                    </Text>
                  )}
                  <Group gap="8px">
                    <Text size="xs" title="Created at" c="dark.3" fw="565">
                      <Group gap="4px" align="center">
                        <PencilSimpleIcon weight="bold" />
                        UPDATED{" "}
                      </Group>
                    </Text>
                    <Text size="xs" fw="500">
                      {idea?.updatedAt
                        ? `${formatDateTime(idea?.updatedAt)}`
                        : ""}
                    </Text>
                  </Group>
                </Flex>
              </Box>
              {idea && (
                <TagsManager
                  connectable={{
                    ...idea,
                    type: "idea",
                  }}
                  maxSuggested={1}
                />
              )}
            </Stack>
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
                    onBlur={handleEditorBlur}
                    onContentReady={handleContentReady}
                    dependencies={[ideaId, idea.id]}
                    ref={editorRef}
                    collaborationId={idea.id.toString()}
                  />
                </IdeaProvider>
              )}
            </div>
          </Stack>
        </div>
      </Content>
      <Nav></Nav>
      <RightSidebar startOpened={isDesktop}>
        <RightSidebar.Open>
          <Tabs defaultValue="search">
            <Tabs.List>
              <Tabs.Tab value="search">
                <Group gap="xs">
                  <MagnifyingGlassIcon weight="fill" size={14} />
                  Search
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="access">
                <Group gap="xs">
                  <UserCirclePlusIcon weight="fill" size={14} />
                  Access
                </Group>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="search">
              <Search
                resultActions={[
                  (thing) => {
                    return {
                      id: "connect",
                      label: "Connect",
                      onClick: () => {
                        connect(thing.id.toString());
                      },
                      disabled: !!isConnected(thing.id.toString()),
                    };
                  },
                ]}
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

interface ITools {
  idea: ISafeIdea;
  editor: IEditor;
}

function Tools({ idea, editor }: ITools) {
  const { isMobile } = useLayout();

  const navigate = useNavigate();

  const { load: triggerDeleteIdea, loading: loadingDelete } = useFetch({
    url: `/ideas/${idea.id.toString()}`,
    dependencies: [idea.id.toString()],
    method: "DELETE",
    onSuccess: () => {
      navigate(-1);
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
  }, [loadingDelete, triggerDeleteIdea, idea.id.toString()]);

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
    // if (editorRef.current?.storage.markdown) {
    //   return editorRef.current?.storage.markdown.getMarkdown() as string;
    // }
    return htmlToMarkdown(idea?.content);
  };

  const downloadAsMarkdown = () => {
    if (idea?.content && editor) {
      const markdown = getMarkdownContent();

      downloadTextAsFile(markdown, {
        type: "text/markdown",
        extension: "md",
        name: idea.title,
      });
    }
  };

  const { thingIsPinned, togglePin } = usePins();
  const [pinning, setPinning] = useState(false);
  const isPinned = thingIsPinned(idea.id);
  const handleTogglePin = async () => {
    try {
      setPinning(true);
      await togglePin(idea.id.toString());
    } catch (error) {
      console.error("Error toggling pin:", error);
    } finally {
      setPinning(false);
    }
  };

  const size = isMobile ? "lg" : "md";
  const radius = "md";

  const handleBack = () => {
    navigate(-1);
  };

  const [managingConnections, setManagingConnections] = useState(false);

  return (
    <div>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          <ActionIcon
            onClick={handleBack}
            color="gray"
            variant="subtle"
            size={size}
            radius={radius}
          >
            <ArrowLeftIcon weight="bold" />
          </ActionIcon>
        </Group>
        <Group wrap="nowrap">
          <ActionIcon
            onClick={() => {
              if (pinning) return;
              handleTogglePin();
            }}
            aria-label={isPinned ? "Unpin" : "Pin"}
            size={size}
            radius={radius}
            variant="subtle"
            color="gray"
          >
            <PushPinIcon weight={isPinned ? "fill" : "bold"} />
          </ActionIcon>
          {isMobile && (
            <>
              <ActionIcon
                aria-label="Manage connections"
                size={size}
                radius={radius}
                variant="subtle"
                color="gray"
                onClick={() => setManagingConnections(true)}
              >
                <UniteSquareIcon />
              </ActionIcon>
            </>
          )}
          <Menu
            width={300}
            shadow="md"
            position="bottom-end"
            radius={radius}
            withArrow
            arrowOffset={14}
            zIndex={700}
          >
            <Menu.Target>
              <div>
                <ActionIcon
                  size={size}
                  aria-label="Download"
                  radius={radius}
                  variant="subtle"
                  color="gray"
                >
                  <DownloadSimpleIcon weight="bold" />
                </ActionIcon>
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<BracketsAngleIcon />}
                onClick={downloadAsHTML}
              >
                Export as HTML
              </Menu.Item>
              <Menu.Item
                leftSection={<MarkdownLogoIcon />}
                onClick={downloadAsMarkdown}
              >
                Export as Markdown
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Menu
            width={300}
            shadow="md"
            position="bottom-end"
            radius={radius}
            withArrow
            arrowOffset={14}
            zIndex={700}
          >
            <Menu.Target>
              <div>
                <ActionIcon
                  aria-label="More options"
                  size={size}
                  radius={radius}
                  variant="subtle"
                  color="gray"
                >
                  <DotsThreeVerticalIcon weight="bold" />
                </ActionIcon>
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Tooltip label="Delete Idea">
                <Menu.Item
                  color="red"
                  leftSection={
                    loadingDelete ? <Loader size="xs" /> : <TrashSimpleIcon />
                  }
                  onClick={handleDeleteIdea}
                  disabled={loadingDelete}
                >
                  Delete
                </Menu.Item>
              </Tooltip>
              <Link
                to="view"
                style={{
                  textDecoration: "none",
                }}
              >
                <Menu.Item leftSection={<BookOpenIcon />} onClick={() => {}}>
                  Viewonly
                </Menu.Item>
              </Link>
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
        </Group>
      </Group>
      <PaperDrawer
        opened={managingConnections}
        onClose={() => setManagingConnections(false)}
      >
        <UnderConstruction
          text="This area is under construction"
          omitFeedback
        />
        <ConnectionManager
          connectable={{
            ...idea,
            type: "idea",
          }}
        />
      </PaperDrawer>
    </div>
  );
}
