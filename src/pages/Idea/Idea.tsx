import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import { useDebouncedCallback } from "@mantine/hooks";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ISafeIdea } from "../../../shared/types/idea";
import { IShareAccess } from "../../../app/database/models/share";
import { Editor as IEditor } from "@tiptap/react";
import {
  ActionIcon,
  Group,
  Title,
  Text,
  Card,
  Stack,
  Space,
  Box,
  Flex,
  Menu,
  Tooltip,
  Loader,
  CopyButton,
  Badge,
  Avatar,
} from "@mantine/core";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  BracketsAngleIcon,
  CheckIcon,
  CloudCheckIcon,
  CloudSlashIcon,
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
  TrashSimpleIcon,
  UniteSquareIcon,
  UserCirclePlusIcon,
} from "@phosphor-icons/react";
import Insights from "./Insights";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { useLayout } from "../../contexts/LayoutContext";
import { getTextProcessed } from "../../utils/processing";
import {
  formatDate,
  formatDateTime,
  htmlToMarkdown,
  htmlToPlainText,
} from "../../utils/formatting";
import { api } from "../../server/api";
import TagsManager from "../../components/Display/Interactions/Tags/TagsManager";
import Content from "../../components/UI/Layout/Content";
import Search from "../../components/Search/Search";
import Loading from "../../components/Display/Loading/Loading";

import { IOptimisticIdea, useLandscape } from "../../contexts/LandscapeContext";
import ConnectionManager from "../../components/Display/Interactions/Connections/ConnectionManager";
import useConnectable, {
  IUseConnectableReturn,
} from "../../hooks/useConnectable";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";
import PaperDrawer from "../../components/Display/Paper/PaperDrawer";
import AccessManager from "../../components/Display/Interactions/Access/AccessManager";
import usePins from "../../hooks/usePins";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { downloadTextAsFile } from "../../utils/files";
import { CollaborationInfo } from "../../components/Collaboration/CollaborationInfo";

import { ICollaborationState } from "../../hooks/useCollaboration";

// --- Types ---
type IdeaUnion =
  | (ISafeIdea & { accessLevel?: "owner" | IShareAccess | null })
  | IOptimisticIdea;

export default function Idea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightText = searchParams.get("highlightText");
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<IEditor>(null);

  const isDeletingRef = useRef(false);
  const isMountedRef = useRef(false);

  const [collaborationState, setCollaborationState] =
    useState<ICollaborationState | null>(null);

  const {
    ideas: {
      optimistic: { get: getOptimisticIdea },
    },
    connectable: {
      viewing: { set: setViewing },
    },
  } = useLandscape();

  const {
    elements: {
      statusBar: {
        message: { set: setStatusMessage },
      },
    },
    isMobile,
    isDesktop,
  } = useLayout();

  const optimisticFromStore = useMemo(() => {
    return ideaId ? getOptimisticIdea(ideaId) : undefined;
  }, [ideaId, getOptimisticIdea]);

  const [isOptimistic, setIsOptimistic] = useState(!!optimisticFromStore);

  useEffect(() => {
    setIsOptimistic(!!optimisticFromStore);
  }, [ideaId]);

  const [contentKey, setContentKey] = useState(ideaId);
  const wasOptimisticRef = useRef(isOptimistic);

  useEffect(() => {
    const isOptimisticTransition = wasOptimisticRef.current && !isOptimistic;
    if (!isOptimisticTransition) {
      setContentKey(ideaId);
    }
    wasOptimisticRef.current = isOptimistic;
  }, [ideaId, isOptimistic]);

  const fetchUrl = !isOptimistic && ideaId ? `/ideas/${ideaId}` : null;

  const {
    data: fetchedIdea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<
    undefined,
    ISafeIdea & { accessLevel: "owner" | IShareAccess | null }
  >({
    url: fetchUrl,
    dependencies: [ideaId],
    query: { withDerived: "true" },
    method: "GET",
    runOnMount: !!fetchUrl,
  });

  const ideaToRender: IdeaUnion | undefined =
    optimisticFromStore || fetchedIdea;

  const isViewOnly =
    !isOptimistic &&
    !!ideaToRender &&
    "accessLevel" in ideaToRender &&
    ideaToRender.accessLevel === "viewonly";
  const canEdit = !isOptimistic && !isViewOnly;
  const isOwner =
    !!ideaToRender &&
    "accessLevel" in ideaToRender &&
    ideaToRender.accessLevel === "owner";

  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    if (ideaToRender && document.activeElement !== titleRef.current) {
      if (ideaToRender.title !== title) {
        setTitle(ideaToRender.title);
      }
    }
  }, [ideaToRender?.title, ideaToRender?.id]);

  const { load: triggerDeleteIdea, loading: loadingDelete } = useFetch({
    url: `/ideas/${ideaId}`,
    dependencies: [ideaId],
    method: "DELETE",
    runOnMount: false,
    onSuccess: () => {
      navigate(-1);
      showNotification({
        title: "Success",
        message: "Idea deleted successfully",
      });
    },
    onError: (error: any) => {
      isDeletingRef.current = false;
      showNotification({
        title: "Error Deleting",
        message: error?.message || "Unknown error",
        color: "red",
      });
    },
  });

  const handleDeleteIdea = useCallback(() => {
    if (loadingDelete || isOptimistic) return;

    modals.openConfirmModal({
      title: "Delete this idea?",
      centered: true,
      children: (
        <Text size="sm">
          This action cannot be undone. All associated data will be lost.
        </Text>
      ),
      labels: { confirm: "Delete Idea", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        isDeletingRef.current = true;
        triggerDeleteIdea();
      },
    });
  }, [loadingDelete, triggerDeleteIdea, isOptimistic]);

  const { load: triggerEmbedIdea, loading: loadingEmbeddings } = useFetch({
    url: `/ideas/${ideaId}/embed`,
    method: "POST",
    onFinally: reloadIdea,
  });

  const { load: triggerDerivedCascade, loading: loadingDerivedCascade } =
    useFetch({
      url: `/ideas/${ideaId}/cascade`,
      dependencies: [ideaId],
      method: "POST",
    });

  const handleComputation = async () => {
    await triggerEmbedIdea();
    await triggerDerivedCascade();
  };

  const { load: triggerTitleGeneration, loading: loadingTitleGeneration } =
    useFetch({
      url: `/ideas/${ideaId}/entitle`,
      dependencies: [ideaId],
      method: "POST",
      onFinally: reloadIdea,
    });

  const embeddingsOutOfDate = useCallback(() => {
    if (!fetchedIdea || !fetchedIdea.embeddingsUpdatedAt) return true;
    return (
      new Date(fetchedIdea.contentUpdatedAt) >
      new Date(fetchedIdea.embeddingsUpdatedAt)
    );
  }, [fetchedIdea]);

  const derivedOutOfDate = useCallback(() => {
    if (!fetchedIdea) return false;
    const summary = fetchedIdea.derived?.generative_summary;
    if (!summary?.createdAt) return true;
    return new Date(fetchedIdea.contentUpdatedAt) > new Date(summary.createdAt);
  }, [fetchedIdea]);

  const titleNeedsGeneration = useCallback(() => {
    if (!ideaToRender) return false;
    const cleanTitle = ideaToRender.title
      ?.replaceAll(/_/g, "")
      .replaceAll(/\n/g, "");
    return !cleanTitle || cleanTitle === "Untitled Idea";
  }, [ideaToRender]);

  const computeStateRef = useRef({
    isOptimistic,
    ideaId,
    loadingEmbeddings,
    loadingDerivedCascade,
    embeddingsOutOfDate,
    derivedOutOfDate,
    triggerEmbedIdea,
    triggerDerivedCascade,
  });

  useEffect(() => {
    computeStateRef.current = {
      isOptimistic,
      ideaId,
      loadingEmbeddings,
      loadingDerivedCascade,
      embeddingsOutOfDate,
      derivedOutOfDate,
      triggerEmbedIdea,
      triggerDerivedCascade,
    };
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const state = computeStateRef.current;

      if (isDeletingRef.current) return;

      if (!state.isOptimistic && state.ideaId) {
        if (state.embeddingsOutOfDate() && !state.loadingEmbeddings) {
          state.triggerEmbedIdea();
        }
        if (state.derivedOutOfDate() && !state.loadingDerivedCascade) {
          state.triggerDerivedCascade();
        }
      }
    };
  }, []);

  useDocumentTitle(`${title || "Loading..."} - Noeko`);

  useEffect(() => {
    if (ideaToRender) {
      setViewing({ ...ideaToRender, type: "idea" });
    }
    return () => setViewing(null);
  }, [ideaToRender?.id]);

  useEffect(() => {
    if (!ideaToRender) {
      setStatusMessage("Still loading...");
      return;
    }
    if (isOptimistic) {
      setStatusMessage("Saving...");
      return;
    }
    const { wordCount, characterCount, sentenceCount } = getTextProcessed(
      htmlToPlainText(ideaToRender.content),
    );
    let text = `Saved. ${wordCount} word${
      wordCount === 1 ? "" : "s"
    }. ${characterCount} char${
      characterCount === 1 ? "" : "s"
    }. ${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"}.`;
    if (loadingEmbeddings) text += " Indexing...";
    setStatusMessage(text);
    return () => setStatusMessage("");
  }, [
    ideaToRender?.id,
    ideaToRender?.content,
    isOptimistic,
    loadingEmbeddings,
    setStatusMessage,
  ]);

  const updateTitle = async (newTitle: string) => {
    if (isOptimistic) return;
    await api
      .put(`/ideas/${ideaId}`, { title: newTitle })
      .then(() => reloadIdea());
  };

  const handleContentReady = useCallback(() => {
    if (highlightText) {
      window.location.hash = highlightText;
    }
    if (editorRef.current && !editorReady) {
      setEditorReady(true);
    }
  }, [highlightText, editorReady]);

  const connectable = useConnectable({
    connectable: ideaToRender ? { ...ideaToRender, type: "idea" } : null,
  });
  const { connect, isConnected } = connectable;

  const safeIdea = isOptimistic ? undefined : (ideaToRender as ISafeIdea);

  const [outOfDate, setOutOfDate] = useState(false);
  const compute = useDebouncedCallback(() => {
    handleComputation().finally(() => {
      setOutOfDate(false);
    });
  }, 2000);
  const handleEditorChange = () => {
    setOutOfDate(true);
    compute();
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
              <Tabs.Tab value="insights" disabled={isOptimistic}>
                <Group gap="xs">
                  <EyeIcon weight="bold" />
                  Insights
                </Group>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="context">
              {safeIdea?.derived?.generative_summary && (
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
                    {safeIdea.derived.generative_summary.sentenceSummary ||
                      safeIdea.derived.generative_summary.sentenceOverview || (
                        <Text span c="dimmed" fs="italic">
                          No overview available.
                        </Text>
                      )}
                  </Text>
                </Card>
              )}

              {safeIdea && !isOptimistic && (
                <>
                  <Space my="lg" />
                  <ConnectionManager
                    connectable={{ ...safeIdea, type: "idea" }}
                    maxSuggested={5}
                    outofdate={outOfDate}
                  />
                  <Space my="lg" />
                </>
              )}
              {isOptimistic && <Loading size="sm" />}
            </Tabs.Panel>

            <Tabs.Panel value="insights">
              <Insights
                loadingIdea={loadingIdea}
                idea={safeIdea}
                reloadIdea={reloadIdea}
              />
            </Tabs.Panel>
          </Tabs>
        </LeftSidebar.Open>
      </LeftSidebar>

      <Content key={contentKey}>
        <div className={styles.ideaContainer}>
          <Stack gap="md">
            <Stack>
              {ideaToRender && editorRef.current && (
                <Tools
                  connectable={connectable}
                  editor={editorRef.current}
                  idea={ideaToRender}
                  reloadIdea={reloadIdea}
                  loadingIdea={loadingIdea}
                  isOptimistic={isOptimistic}
                  onDelete={handleDeleteIdea}
                  loadingDelete={loadingDelete}
                />
              )}

              <Group gap="xs">
                <Title
                  ref={titleRef}
                  order={1}
                  m="0"
                  pr="md"
                  contentEditable={canEdit}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    if (isOptimistic) return;
                    const newTitle = e.currentTarget.innerText;
                    if (newTitle !== title) {
                      setTitle(newTitle);
                      updateTitle(newTitle);
                    }
                  }}
                  className={styles.editableTitle}
                  style={{
                    opacity: canEdit ? 1 : 0.7,
                    cursor: canEdit ? "text" : "default",
                  }}
                >
                  {title || ""}
                </Title>

                {isViewOnly && (
                  <Badge color="gray" variant="outline">
                    View Only
                  </Badge>
                )}

                {titleNeedsGeneration() && !isOptimistic && (
                  <ActionIcon
                    onClick={() => triggerTitleGeneration()}
                    variant="light"
                    size="md"
                    radius="md"
                    color="gray"
                    disabled={loadingTitleGeneration}
                    loading={loadingTitleGeneration}
                  >
                    <SparkleIcon size={14} weight="duotone" />
                  </ActionIcon>
                )}

                {safeIdea?.titleGeneratedAt && (
                  <div
                    className={styles.generatedIndicator}
                    title={"This title was generated automatically."}
                  >
                    <SparkleIcon />
                  </div>
                )}
              </Group>

              <Box
                bg="dark.9"
                c="dark.1"
                style={{ borderRadius: "var(--mantine-radius-md)" }}
                p="4px 8px"
              >
                <Flex gap="xs" direction={"row"} align="center" wrap={"wrap"}>
                  <Group gap="4px" align="center">
                    <ClockIcon
                      color="var(--mantine-color-dark-3)"
                      size={12}
                      weight="bold"
                    />
                    <Text size="xs" fw="500">
                      {ideaToRender?.createdAt
                        ? `${formatDate(ideaToRender.createdAt)}`
                        : "Now"}
                    </Text>
                  </Group>
                  <Text size="sm" fw="bold" c="dark.4">
                    •
                  </Text>
                  <Group gap="4px" align="center">
                    <PencilSimpleIcon
                      color="var(--mantine-color-dark-3)"
                      size={12}
                      weight="bold"
                    />
                    <Text size="xs" fw="500">
                      {ideaToRender?.updatedAt
                        ? `${formatDateTime(ideaToRender.updatedAt)}`
                        : "Now"}
                    </Text>
                  </Group>
                  {collaborationState && canEdit && (
                    <>
                      <Text size="sm" fw="bold" c="dark.4">
                        •
                      </Text>
                      <CollaborationInfo
                        status={collaborationState.status}
                        members={collaborationState.members}
                      />
                    </>
                  )}
                </Flex>
              </Box>

              {safeIdea && (
                <TagsManager
                  connectable={{ ...safeIdea, type: "idea" }}
                  maxSuggested={1}
                />
              )}
            </Stack>

            <div className={styles.contentArea}>
              {ideaToRender && (
                <DreamWriter
                  autofocus
                  readOnly={isOptimistic || isViewOnly}
                  stickyMenu={false}
                  onChange={handleEditorChange}
                  onContentReady={handleContentReady}
                  dependencies={[ideaId, ideaToRender.id]}
                  ref={editorRef}
                  onStateChange={({ collaboration }) => {
                    setCollaborationState((prev) => {
                      if (!prev) return collaboration;
                      if (
                        prev.status === collaboration.status &&
                        prev.members.length === collaboration.members.length &&
                        prev.members.every(
                          (member, i) =>
                            member.name === collaboration.members[i].name,
                        )
                      ) {
                        return prev;
                      }
                      return collaboration;
                    });
                  }}
                  collaborationId={
                    canEdit ? ideaToRender.id.toString() : undefined
                  }
                  initialContent={canEdit ? undefined : ideaToRender.content}
                  connectableId={
                    isViewOnly ? undefined : ideaToRender.id.toString()
                  }
                />
              )}
            </div>
          </Stack>
        </div>
      </Content>
      <Nav />
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
              {isOwner && (
                <Tabs.Tab value="access" disabled={isOptimistic}>
                  <Group gap="xs">
                    <UserCirclePlusIcon weight="fill" size={14} />
                    Access
                  </Group>
                </Tabs.Tab>
              )}
            </Tabs.List>
            <Tabs.Panel value="search">
              <Search
                resultActions={[
                  (thing) => ({
                    id: "connect",
                    label: "Connect",
                    onClick: () => connect(thing.id.toString()),
                    disabled:
                      !!isConnected(thing.id.toString()) || isOptimistic,
                  }),
                ]}
              />
            </Tabs.Panel>
            {isOwner && (
              <Tabs.Panel value="access">
                {safeIdea &&
                  (isMobile ? (
                    <Box p="md">
                      <Text size="sm" c="dimmed" ta="center">
                        Access controls are in the top toolbar.
                      </Text>
                    </Box>
                  ) : (
                    <AccessManager
                      connectable={{ ...safeIdea, type: "idea" }}
                    />
                  ))}
                {!safeIdea && <Loading size="sm" />}
              </Tabs.Panel>
            )}
          </Tabs>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}

interface ITools {
  idea: IdeaUnion;
  editor: IEditor;
  connectable: IUseConnectableReturn;
  reloadIdea: () => void;
  loadingIdea: boolean;
  isOptimistic: boolean;
  // FIX: Receive handler and state from parent
  onDelete: () => void;
  loadingDelete: boolean;
}

function Tools({
  idea,
  editor,
  isOptimistic,
  onDelete,
  loadingDelete,
}: ITools) {
  const { isMobile } = useLayout();
  const navigate = useNavigate();
  const { thingIsPinned, togglePin } = usePins();
  const [pinning, setPinning] = useState(false);
  const [managingConnections, setManagingConnections] = useState(false);
  const [managingAccess, setManagingAccess] = useState(false);

  const isPinned = thingIsPinned(idea.id);
  const size = isMobile ? "lg" : "md";
  const radius = "md";

  const handleTogglePin = async () => {
    if (isOptimistic) return;
    try {
      setPinning(true);
      await togglePin(idea.id.toString());
    } finally {
      setPinning(false);
    }
  };

  const getMarkdownContent = () => {
    return idea?.content ? htmlToMarkdown(idea.content) : "";
  };

  const downloadAsHTML = () => {
    if (idea?.content) {
      downloadTextAsFile(idea.content, {
        type: "text/html",
        extension: "html",
        name: idea.title,
      });
    }
  };

  const downloadAsMarkdown = () => {
    if (idea?.content) {
      downloadTextAsFile(getMarkdownContent(), {
        type: "text/markdown",
        extension: "md",
        name: idea.title,
      });
    }
  };

  return (
    <div>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          <ActionIcon
            onClick={() => navigate(-1)}
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
            onClick={() => !pinning && handleTogglePin()}
            aria-label={isPinned ? "Unpin" : "Pin"}
            size={size}
            radius={radius}
            variant="subtle"
            color="gray"
            disabled={isOptimistic}
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
                disabled={isOptimistic}
              >
                <UniteSquareIcon />
              </ActionIcon>

              <ActionIcon
                aria-label="Manage access"
                size={size}
                radius={radius}
                variant="subtle"
                color="gray"
                onClick={() => setManagingAccess(true)}
                disabled={isOptimistic}
              >
                <UserCirclePlusIcon weight="fill" />
              </ActionIcon>
            </>
          )}

          <Menu
            width={200}
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
            width={200}
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
                  disabled={isOptimistic}
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
                  // FIX: Use handler passed from parent
                  onClick={onDelete}
                  disabled={loadingDelete}
                >
                  Delete
                </Menu.Item>
              </Tooltip>

              <CopyButton value={getMarkdownContent()}>
                {({ copied, copy }) => (
                  <Menu.Item
                    leftSection={copied ? <CheckIcon /> : <MarkdownLogoIcon />}
                    onClick={copy}
                  >
                    Copy as Markdown
                  </Menu.Item>
                )}
              </CopyButton>

              {idea?.content && (
                <CopyButton value={htmlToPlainText(idea.content)}>
                  {({ copied, copy }) => (
                    <Menu.Item
                      leftSection={copied ? <CheckIcon /> : <CursorTextIcon />}
                      onClick={copy}
                    >
                      Copy as Text
                    </Menu.Item>
                  )}
                </CopyButton>
              )}

              {idea?.content && (
                <CopyButton value={idea.content}>
                  {({ copied, copy }) => (
                    <Menu.Item
                      leftSection={copied ? <CheckIcon /> : <CursorTextIcon />}
                      onClick={copy}
                    >
                      Copy as HTML
                    </Menu.Item>
                  )}
                </CopyButton>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {!isOptimistic && (
        <>
          <PaperDrawer
            title="Manage Connections"
            opened={managingConnections}
            onClose={() => setManagingConnections(false)}
          >
            <ConnectionManager connectable={{ ...idea, type: "idea" }} />
          </PaperDrawer>

          <PaperDrawer
            title="Manage Access"
            opened={managingAccess}
            onClose={() => setManagingAccess(false)}
          >
            <AccessManager connectable={{ ...idea, type: "idea" }} />
          </PaperDrawer>
        </>
      )}
    </div>
  );
}
