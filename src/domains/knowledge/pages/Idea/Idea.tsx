import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "@core/hooks/useFetch";
import { useDebouncedCallback } from "@mantine/hooks";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useDocumentTitle } from "@core/hooks/useDocumentTitle";
import { ISafeIdea } from "../../../../../shared/types/idea";
import { IShareAccess } from "../../../../../app/database/models/share";
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
  Center,
} from "@mantine/core";
import { Tabs } from "@core/design/components/Layout/Utils/Tabs";
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
  FeatherIcon,
  FileIcon,
} from "@phosphor-icons/react";
import Insights from "./Insights";
import { DreamWriter } from "@/domains/editor";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { useLayout } from "@/contexts/LayoutContext";
import { getTextProcessed } from "@core/utils/processing";
import {
  formatDate,
  formatDateTime,
  htmlToMarkdown,
  htmlToPlainText,
} from "@core/utils/formatting";
import { api } from "@infrastructure/api/client";
import TagsManager from "@/core/design/components/Display/Interactions/Tags/TagsManager";
import Content from "@core/design/components/Layout/Content";
import Search from "@domains/discovery/components/Search/Search";
import Loading from "@core/design/components/Loading/Loading";
import FileManager from "@/core/design/components/Display/Interactions/Files/FileManager";

import { IOptimisticIdea, useLandscape } from "@/contexts/LandscapeContext";
import ConnectionManager from "@/core/design/components/Display/Interactions/Connections/ConnectionManager";
import useConnectable, { IUseConnectableReturn } from "@domains/knowledge/hooks/useConnectable";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import PaperDrawer from "@core/design/components/Paper/PaperDrawer";
import AccessManager from "@/core/design/components/Display/Interactions/Access/AccessManager";
import usePins from "@domains/knowledge/hooks/usePins";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { downloadTextAsFile } from "@infrastructure/api/files";
import { CollaborationInfo } from "@/core/design/components/Collaboration/CollaborationInfo";

import { ICollaborationState } from "@/core/hooks/useCollaboration";
import { userFormattedName } from "@domains/identity/utils/user";
import { isEqual } from "lodash";
import LangtonsAntLoader from "@core/design/components/Loading/AntLoader";
import PaperEyebrow from "@/core/design/components/Paper/PaperEyebrow/PaperEyebrow";
import { PaperTitle } from "@/core/design/components/Paper/PaperTitle/PaperTitle";
import { useApiQuery } from "@/core/hooks/useApiQuery";
import type { IOwnerSummary } from "../../../../../shared/types/organization";

// --- Types ---
type IdeaUnion = (ISafeIdea & { accessLevel?: "owner" | IShareAccess | null }) | IOptimisticIdea;

export default function Idea() {
  const { i18n } = useLingui();
  const { ideaId } = useParams<{ ideaId: string }>();
  const { data: owner } = useApiQuery<IOwnerSummary>({
    url: ideaId?.includes(":") ? `/organizations/resources/${ideaId}/owner` : null,
    queryKey: ["resource-owner", ideaId],
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightText = searchParams.get("highlightText");
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<IEditor>(null);

  const isDeletingRef = useRef(false);
  const isMountedRef = useRef(false);

  const [collaborationState, setCollaborationState] = useState<ICollaborationState | null>(null);

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
  } = useFetch<undefined, ISafeIdea & { accessLevel: "owner" | IShareAccess | null }>({
    url: fetchUrl,
    dependencies: [ideaId],
    query: { withDerived: "true" },
    method: "GET",
  });

  useEffect(() => {
    if (!isOptimistic) {
      reloadIdea();
    }
  }, [isOptimistic]);

  const ideaToRender: IdeaUnion | undefined = optimisticFromStore || fetchedIdea;

  const isViewOnly =
    !isOptimistic &&
    !!ideaToRender &&
    "accessLevel" in ideaToRender &&
    ideaToRender.accessLevel === "viewonly";
  const canEdit = !isOptimistic && !isViewOnly;
  const isOwner =
    !!ideaToRender && "accessLevel" in ideaToRender && ideaToRender.accessLevel === "owner";

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
        title: i18n._(t`Success`),
        message: i18n._(t`Idea deleted successfully`),
      });
    },
    onError: (error: any) => {
      isDeletingRef.current = false;
      showNotification({
        title: i18n._(t`Error Deleting`),
        message: error?.message || i18n._(t`Unknown error`),
        color: "red",
      });
    },
  });

  const handleDeleteIdea = useCallback(() => {
    if (loadingDelete || isOptimistic) return;

    modals.openConfirmModal({
      title: i18n._(t`Delete this idea?`),
      centered: true,
      children: (
        <Text size="sm">
          <Trans>This action cannot be undone. All associated data will be lost.</Trans>
        </Text>
      ),
      labels: { confirm: i18n._(t`Delete Idea`), cancel: i18n._(t`Cancel`) },
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

  const { load: triggerDerivedCascade, loading: loadingDerivedCascade } = useFetch({
    url: `/ideas/${ideaId}/cascade`,
    dependencies: [ideaId],
    method: "POST",
  });

  const handleComputation = async () => {
    await triggerEmbedIdea();
    await triggerDerivedCascade();
  };

  const { load: triggerTitleGeneration, loading: loadingTitleGeneration } = useFetch<
    undefined,
    ISafeIdea
  >({
    url: `/ideas/${ideaId}/entitle`,
    dependencies: [ideaId],
    method: "POST",
    onFinally: reloadIdea,
    onSuccess: () => {
      reloadIdea();
    },
  });

  const embeddingsOutOfDate = useCallback(() => {
    if (!fetchedIdea || !fetchedIdea.embeddingsUpdatedAt) return true;
    return new Date(fetchedIdea.contentUpdatedAt) > new Date(fetchedIdea.embeddingsUpdatedAt);
  }, [fetchedIdea]);

  const derivedOutOfDate = useCallback(() => {
    if (!fetchedIdea) return false;
    const summary = fetchedIdea.derived?.generative_summary;
    if (!summary?.createdAt) return true;
    return new Date(fetchedIdea.contentUpdatedAt) > new Date(summary.createdAt);
  }, [fetchedIdea]);

  const titleNeedsGeneration = useCallback(() => {
    if (!ideaToRender) return false;
    const cleanTitle = ideaToRender.title?.replaceAll(/_/g, "").replaceAll(/\n/g, "");
    return !cleanTitle || cleanTitle === i18n._(t`Untitled Idea`);
  }, [ideaToRender, i18n]);

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

  useDocumentTitle(`${title || i18n._(t`Loading...`)} - Noeko`);

  useEffect(() => {
    if (ideaToRender) {
      setViewing({ ...ideaToRender, type: "idea" });
    }
    return () => setViewing(null);
  }, [ideaToRender?.id]);

  useEffect(() => {
    if (!ideaToRender) {
      setStatusMessage(i18n._(t`Still loading...`));
      return;
    }
    if (isOptimistic) {
      setStatusMessage(i18n._(t`Saving...`));
      return;
    }
    const { wordCount, characterCount, sentenceCount } = getTextProcessed(
      htmlToPlainText(ideaToRender.content)
    );
    const savedText = i18n._(t`Saved.`);
    const wordsText = wordCount === 1 ? i18n._(t`1 word`) : i18n._(t`${wordCount} words`);
    const charsText = characterCount === 1 ? i18n._(t`1 char`) : i18n._(t`${characterCount} chars`);
    const sentencesText =
      sentenceCount === 1 ? i18n._(t`1 sentence`) : i18n._(t`${sentenceCount} sentences`);

    let text = `${savedText} ${wordsText}. ${charsText}. ${sentencesText}.`;
    if (loadingEmbeddings) text += ` ${i18n._(t`Indexing...`)}`;
    setStatusMessage(text);
    return () => setStatusMessage("");
  }, [
    ideaToRender?.id,
    ideaToRender?.content,
    isOptimistic,
    loadingEmbeddings,
    setStatusMessage,
    i18n,
  ]);

  const updateTitle = async (newTitle: string) => {
    if (isOptimistic) return;
    await api.put(`/ideas/${ideaId}`, { title: newTitle }).then(() => reloadIdea());
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

  const compute = useDebouncedCallback(() => {
    handleComputation();
  }, 2000);
  const handleEditorChange = () => {
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
                  <Trans>Context</Trans>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="files" disabled={isOptimistic}>
                <Group gap="xs">
                  <FileIcon weight="bold" />
                  <Trans>Attachments</Trans>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="insights" disabled={isOptimistic}>
                <Group gap="xs">
                  <EyeIcon weight="bold" />
                  <Trans>Insights</Trans>
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
                    <Trans>The Gist</Trans>
                  </Text>
                  <Text size="sm">
                    {safeIdea.derived.generative_summary.sentenceSummary ||
                      safeIdea.derived.generative_summary.sentenceOverview || (
                        <Text span c="dimmed" fs="italic">
                          <Trans>No overview available.</Trans>
                        </Text>
                      )}
                  </Text>
                </Card>
              )}

              {safeIdea && !isOptimistic && (
                <>
                  <Space my="lg" />
                  <ConnectionManager connectable={{ ...safeIdea, type: "idea" }} maxSuggested={5} />
                  <Space my="lg" />
                </>
              )}
              {isOptimistic && <Loading size="sm" />}
            </Tabs.Panel>

            <Tabs.Panel value="files">
              {safeIdea && (
                <FileManager connectableId={safeIdea.id.toString()} editor={editorRef.current} />
              )}
            </Tabs.Panel>
            <Tabs.Panel value="insights">
              <Insights loadingIdea={loadingIdea} idea={safeIdea} reloadIdea={reloadIdea} />
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
                <PaperTitle
                  title={ideaToRender?.title || ""}
                  onUpdate={updateTitle}
                  canEdit={canEdit && !isOptimistic}
                  isViewOnly={isViewOnly}
                  needsGeneration={titleNeedsGeneration() && !isOptimistic}
                  onGenerate={() => triggerTitleGeneration()}
                  isGenerating={loadingTitleGeneration}
                  wasGenerated={!!safeIdea?.titleGeneratedAt}
                />
              </Group>

              <Box
                bg="dark.9"
                c="dark.1"
                style={{ borderRadius: "var(--mantine-radius-md)" }}
                p="4px 8px"
              >
                <Flex gap="xs" direction={"row"} align="center" wrap={"wrap"}>
                  <Tooltip
                    label={`Owned by ${owner?.name || (ideaToRender?.author ? userFormattedName(ideaToRender.author) : "Unknown owner")}`}
                    transitionProps={{
                      transition: "rotate-right",
                      duration: 200,
                    }}
                  >
                    <Group gap="4px" align="center">
                      <FeatherIcon color="var(--mantine-color-dark-3)" size={12} weight="bold" />
                      <Text size="xs" fw="500">
                        {owner?.name ||
                          (ideaToRender?.author
                            ? userFormattedName(ideaToRender.author)
                            : "Unknown owner")}
                      </Text>
                    </Group>
                  </Tooltip>
                  <Text size="sm" fw="bold" c="dark.4">
                    •
                  </Text>
                  <Tooltip
                    label={i18n._(t`Created at`)}
                    transitionProps={{
                      transition: "rotate-right",
                      duration: 200,
                    }}
                  >
                    <Group gap="4px" align="center">
                      <ClockIcon color="var(--mantine-color-dark-3)" size={12} weight="bold" />
                      <Text size="xs" fw="500">
                        {ideaToRender?.createdAt
                          ? `${formatDate(ideaToRender.createdAt)}`
                          : i18n._(t`Now`)}
                      </Text>
                    </Group>
                  </Tooltip>
                  <Text size="sm" fw="bold" c="dark.4">
                    •
                  </Text>
                  <Tooltip
                    label={i18n._(t`Last updated`)}
                    transitionProps={{
                      transition: "rotate-right",
                      duration: 200,
                    }}
                  >
                    <Group gap="4px" align="center">
                      <PencilSimpleIcon
                        color="var(--mantine-color-dark-3)"
                        size={12}
                        weight="bold"
                      />
                      <Text size="xs" fw="500">
                        {ideaToRender?.updatedAt
                          ? `${formatDateTime(ideaToRender.updatedAt)}`
                          : i18n._(t`Now`)}
                      </Text>
                    </Group>
                  </Tooltip>
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
                <TagsManager connectable={{ ...safeIdea, type: "idea" }} maxSuggested={1} />
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
                          (member, i) => member.name === collaboration.members[i].name
                        )
                      ) {
                        return prev;
                      }
                      return collaboration;
                    });
                  }}
                  collaborationId={canEdit ? ideaToRender.id.toString() : undefined}
                  initialContent={canEdit ? undefined : ideaToRender.content}
                  connectableId={isViewOnly ? undefined : ideaToRender.id.toString()}
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
                  <Trans>Search</Trans>
                </Group>
              </Tabs.Tab>
              {isOwner && (
                <Tabs.Tab value="access" disabled={isOptimistic}>
                  <Group gap="xs">
                    <UserCirclePlusIcon weight="fill" size={14} />
                    <Trans>Access</Trans>
                  </Group>
                </Tabs.Tab>
              )}
            </Tabs.List>
            <Tabs.Panel value="search">
              <Search
                resultActions={[
                  (thing) => ({
                    id: "connect",
                    label: i18n._(t`Connect`),
                    onClick: () => connect(thing.id.toString()),
                    disabled: !!isConnected(thing.id.toString()) || isOptimistic,
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
                        <Trans>Access controls are in the top toolbar.</Trans>
                      </Text>
                    </Box>
                  ) : (
                    <AccessManager connectable={{ ...safeIdea, type: "idea" }} />
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

function Tools({ idea, editor, isOptimistic, onDelete, loadingDelete }: ITools) {
  const { i18n } = useLingui();
  const { isMobile } = useLayout();
  const navigate = useNavigate();
  const { thingIsPinned, togglePin } = usePins();
  const [pinning, setPinning] = useState(false);
  const [managingConnections, setManagingConnections] = useState(false);
  const [managingAccess, setManagingAccess] = useState(false);
  const [managingFiles, setManagingFiles] = useState(false);

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
      <PaperEyebrow
        actions={[
          {
            icon: PushPinIcon,
            name: isPinned ? i18n._(t`Unpin`) : i18n._(t`Pin`),
            run: () => !pinning && handleTogglePin(),
            disabled: isOptimistic,
            weight: isPinned ? "fill" : "bold",
          },
          {
            icon: UniteSquareIcon,
            name: i18n._(t`Manage Connections`),
            run: () => setManagingConnections(true),
            disabled: isOptimistic,
            invisible: !isMobile,
          },
          {
            icon: UserCirclePlusIcon,
            name: i18n._(t`Manage Access`),
            run: () => setManagingAccess(true),
            disabled: isOptimistic,
            invisible: !isMobile,
          },
        ]}
        right={
          <>
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
                    aria-label={i18n._(t`Download`)}
                    radius={radius}
                    variant="subtle"
                    color="gray"
                  >
                    <DownloadSimpleIcon weight="bold" />
                  </ActionIcon>
                </div>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<BracketsAngleIcon />} onClick={downloadAsHTML}>
                  <Trans>Export as HTML</Trans>
                </Menu.Item>
                <Menu.Item leftSection={<MarkdownLogoIcon />} onClick={downloadAsMarkdown}>
                  <Trans>Export as Markdown</Trans>
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
                    aria-label={i18n._(t`More options`)}
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
                <Tooltip label={i18n._(t`Delete Idea`)}>
                  <Menu.Item
                    color="red"
                    leftSection={loadingDelete ? <Loader size="xs" /> : <TrashSimpleIcon />}
                    // FIX: Use handler passed from parent
                    onClick={onDelete}
                    disabled={loadingDelete}
                  >
                    <Trans>Delete</Trans>
                  </Menu.Item>
                </Tooltip>

                <Menu.Item
                  leftSection={<FileIcon />}
                  onClick={() => setManagingFiles(true)}
                  disabled={isOptimistic}
                >
                  <Trans>Manage Files</Trans>
                </Menu.Item>

                <CopyButton value={getMarkdownContent()}>
                  {({ copied, copy }) => (
                    <Menu.Item
                      leftSection={copied ? <CheckIcon /> : <MarkdownLogoIcon />}
                      onClick={copy}
                    >
                      <Trans>Copy as Markdown</Trans>
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
                        <Trans>Copy as Text</Trans>
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
                        <Trans>Copy as HTML</Trans>
                      </Menu.Item>
                    )}
                  </CopyButton>
                )}
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />

      {!isOptimistic && isMobile && (
        <>
          <PaperDrawer
            title={i18n._(t`Manage Connections`)}
            opened={managingConnections}
            onClose={() => setManagingConnections(false)}
          >
            <ConnectionManager connectable={{ ...idea, type: "idea" }} />
          </PaperDrawer>

          <PaperDrawer
            title={i18n._(t`Manage Access`)}
            opened={managingAccess}
            onClose={() => setManagingAccess(false)}
          >
            <AccessManager connectable={{ ...idea, type: "idea" }} />
          </PaperDrawer>

          <PaperDrawer
            title={i18n._(t`Manage Files`)}
            opened={managingFiles}
            onClose={() => setManagingFiles(false)}
          >
            <FileManager connectableId={idea.id.toString()} editor={editor} />
          </PaperDrawer>
        </>
      )}
    </div>
  );
}
