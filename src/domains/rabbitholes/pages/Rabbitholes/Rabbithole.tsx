import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Card,
  CopyButton,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopySimpleIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  FileArchiveIcon,
  ListIcon,
  MarkdownLogoIcon,
  PlusIcon,
  SparkleIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  TrashSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate, useParams } from "react-router";
import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperEyebrow from "@core/design/components/Paper/PaperEyebrow/PaperEyebrow";
import { PaperTitle } from "@core/design/components/Paper/PaperTitle/PaperTitle";
import PaperTag from "@core/design/components/Paper/Tags/PaperTag";
import PaperThings from "@core/design/components/Paper/Things/PaperThings";
import { GLOBAL_SEMANTIC_SEARCH_THRESHOLD } from "../../../../../shared/constants/semantic";
import { TagPicker } from "@core/design/components/Display/Interactions/Tags/TagPicker";
import { getThingPropsFromConnectable } from "@core/design/components/Paper/Things/thingUtils";
import { useDocumentTitle } from "@core/hooks/useDocumentTitle";
import { useLandscape } from "@/contexts/LandscapeContext";
import { useLayoutSidebarActions, useLayoutViewport } from "@/contexts/LayoutContext";
import { api } from "@infrastructure/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { IConnectable } from "../../../../../shared/types/constellation";
import { IRabbithole, IRabbitholeSuggestion } from "../../../../../shared/types/rabbithole";
import { ITag } from "../../../../../shared/types/tags";
import {
  deleteRabbithole,
  includeThingInRabbithole,
  unIncludeThingInRabbithole,
} from "@domains/rabbitholes/utils/rabbitholes";
import ManageRabbithole from "@domains/rabbitholes/components/Rabbitholes/ManageRabbithole";
import { createTag } from "@domains/knowledge/utils/tags";
import {
  downloadRabbitholeMarkdown,
  downloadRabbitholeMarkdownArchive,
  rabbitholeToMarkdown,
} from "@domains/rabbitholes/utils/export";
import { SpyglassIcon } from "@core/design/icons/Icons";
import {
  invalidateRabbitholeCaches,
  removeRabbitholeFromCaches,
  useGenerateRabbitholeContext,
  useRabbitholeQuery,
  useUpdateRabbithole,
} from "@domains/rabbitholes/hooks/useRabbitholes";
import styles from "./Rabbithole.module.scss";

export default function Rabbithole() {
  const { rabbitholeId } = useParams();
  const navigate = useNavigate();
  const [manageOpened, setManageOpened] = useState(false);
  const [preparingArchive, setPreparingArchive] = useState(false);
  const [managerFocusRequest, setManagerFocusRequest] = useState(0);
  const [suggestions, setSuggestions] = useState<IRabbitholeSuggestion[]>([]);
  const titleSaveTimeout = useRef<number | null>(null);
  const descriptionSaveTimeout = useRef<number | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [generatingField, setGeneratingField] = useState<"name" | "description" | null>(null);
  const [description, setDescription] = useState("");
  const [draggingOver, setDraggingOver] = useState(false);
  const { isMobile, isDesktop } = useLayoutViewport();
  const { setRightSidebarMode } = useLayoutSidebarActions();
  const queryClient = useQueryClient();

  const {
    data: rabbithole,
    isLoading: loading,
    error: rabbitholeError,
  } = useRabbitholeQuery(rabbitholeId ?? null);
  const updateRabbithole = useUpdateRabbithole(rabbitholeId ?? null);
  const generateRabbitholeContext = useGenerateRabbitholeContext(rabbitholeId ?? null);

  const {
    rabbitholes: {
      entered: { get: entered, set: setEntered, reload: reloadEntered },
    },
  } = useLandscape();
  const isEntered = entered?.id.toString() === rabbithole?.id.toString();

  useEffect(() => {
    if (rabbithole && document.activeElement !== descriptionRef.current) {
      setDescription(rabbithole.description ?? "");
    }
  }, [rabbithole?.id, rabbithole?.description]);

  const openManager = () => {
    setManagerFocusRequest((request) => request + 1);
    if (isMobile) {
      setManageOpened(true);
      return;
    }
    setRightSidebarMode("open");
  };

  useDocumentTitle(`${rabbithole?.name || "Rabbithole"} - Noeko`);

  const refresh = () => {
    if (rabbitholeId) void invalidateRabbitholeCaches(queryClient, rabbitholeId);
    if (isEntered) reloadEntered();
  };

  const loadSuggestions = async () => {
    if (!rabbitholeId) return;
    try {
      const response = await api.post(`/rabbitholes/${rabbitholeId}/suggestions/reconcile`, {
        limit: 12,
      });
      setSuggestions(response.data.data ?? []);
      if (rabbithole?.recommendationPolicy?.mode === "auto-add") refresh();
    } catch {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (!rabbitholeId || !rabbithole) return;
    const hasUsefulContext =
      Boolean(rabbithole.description?.trim()) ||
      !["Unnamed Rabbithole", "Untitled Rabbithole"].includes(rabbithole.name);
    if (hasUsefulContext) void loadSuggestions();
  }, [rabbitholeId]);

  const update = async (changes: Partial<Pick<IRabbithole, "name" | "description">>) => {
    if (!rabbitholeId) return;
    setSaving(true);
    try {
      await updateRabbithole.mutateAsync(changes);
      if (isEntered) reloadEntered();
      await loadSuggestions();
    } catch {
      showNotification({ message: "Could not save Rabbithole changes", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const cancelPendingContextSave = (field: "name" | "description") => {
    const timeoutRef = field === "name" ? titleSaveTimeout : descriptionSaveTimeout;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const generateContext = async (field: "name" | "description") => {
    if (!rabbitholeId || !(rabbithole?.includes?.length ?? 0)) return;
    cancelPendingContextSave(field);
    setGeneratingField(field);
    try {
      await generateRabbitholeContext.mutateAsync(field);
      if (isEntered) reloadEntered();
      await loadSuggestions();
    } catch {
      showNotification({
        message: `Could not generate the Rabbithole ${field === "name" ? "title" : "description"}`,
        color: "red",
      });
    } finally {
      setGeneratingField(null);
    }
  };

  const scheduleContextUpdate = (
    field: "name" | "description",
    value: string,
    immediate = false
  ) => {
    const timeoutRef = field === "name" ? titleSaveTimeout : descriptionSaveTimeout;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    const save = () => {
      timeoutRef.current = null;
      void update({ [field]: value });
    };
    if (immediate) save();
    else timeoutRef.current = window.setTimeout(save, 700);
  };

  useEffect(
    () => () => {
      if (titleSaveTimeout.current) window.clearTimeout(titleSaveTimeout.current);
      if (descriptionSaveTimeout.current) window.clearTimeout(descriptionSaveTimeout.current);
    },
    []
  );

  const removeThing = async (thingId: string) => {
    if (!rabbitholeId) return;
    await unIncludeThingInRabbithole(rabbitholeId, thingId);
    refresh();
  };

  const acceptSuggestion = async (thingId: string) => {
    if (!rabbitholeId) return;
    try {
      await api.post(`/rabbitholes/${rabbitholeId}/suggestions/${thingId}/accept`);
      setSuggestions((current) => current.filter((thing) => thing.id.toString() !== thingId));
      refresh();
    } catch {
      showNotification({ message: "Could not add that suggestion", color: "red" });
    }
  };

  const includedTags = useMemo(
    () =>
      (rabbithole?.includes ?? []).filter(
        (thing): thing is ITag & { type: "tag" } =>
          thing.type === "tag" || thing.id.toString().startsWith("tag:")
      ),
    [rabbithole?.includes]
  );

  const includedContent = useMemo(
    () =>
      (rabbithole?.includes ?? []).filter(
        (thing): thing is IConnectable =>
          thing.type !== "tag" && !thing.id.toString().startsWith("tag:")
      ),
    [rabbithole?.includes]
  );

  const contentThings = useMemo(
    () =>
      includedContent.map((thing) =>
        getThingPropsFromConnectable(
          thing as IConnectable,
          {
            action: {
              icon: XIcon,
              tooltip: "Remove from Rabbithole",
              onClick: () => void removeThing(thing.id.toString()),
            },
            displayPreview: false,
          },
          true
        )
      ),
    [includedContent]
  );

  const suggestedThings = useMemo(
    () =>
      suggestions.slice(0, 3).map((thing) =>
        getThingPropsFromConnectable(
          thing,
          {
            state: "suggested",
            action: {
              icon: PlusIcon,
              tooltip: "Add to Rabbithole",
              onClick: () => void acceptSuggestion(thing.id.toString()),
            },
            onClick: () => void acceptSuggestion(thing.id.toString()),
            preventClickDefault: true,
            displayPreview: false,
          },
          true
        )
      ),
    [suggestions]
  );

  const displayedThings = useMemo(
    () => [...contentThings, ...suggestedThings],
    [contentThings, suggestedThings]
  );

  const contentSummary = useMemo(() => {
    if (rabbithole?.contentSummary) return rabbithole.contentSummary;
    const included = includedContent;
    if (!included.length) return "This workspace is ready for its first thought, source, or task.";
    const counts = included.reduce<Record<string, number>>((accumulator, thing) => {
      const type = thing.id.toString().split(":")[0];
      accumulator[type] = (accumulator[type] ?? 0) + 1;
      return accumulator;
    }, {});
    const detail = Object.entries(counts)
      .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
      .join(", ");
    return `This Rabbithole currently brings together ${detail}.`;
  }, [rabbithole?.contentSummary, includedContent]);

  const contentBreakdown = useMemo(() => {
    const counts = includedContent.reduce<Record<string, number>>((accumulator, thing) => {
      const type = thing.id.toString().split(":")[0];
      accumulator[type] = (accumulator[type] ?? 0) + 1;
      return accumulator;
    }, {});
    return Object.entries(counts)
      .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
      .join(" · ");
  }, [includedContent]);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingOver(false);
    if (!rabbitholeId) return;
    try {
      const data = JSON.parse(event.dataTransfer.getData("application/json")) as {
        thingId?: string;
      };
      if (!data.thingId) return;
      await includeThingInRabbithole(rabbitholeId, data.thingId);
      refresh();
    } catch {
      showNotification({ message: "Could not include the dropped item", color: "red" });
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete Rabbithole?",
      children: <Text>This removes the workspace, not the knowledge it contains.</Text>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        if (!rabbithole) return;
        await deleteRabbithole(rabbithole.id.toString());
        await removeRabbitholeFromCaches(queryClient, rabbithole.id.toString());
        if (isEntered) setEntered(null);
        navigate("/rabbitholes");
      },
    });
  };

  const includeTag = async (tag: ITag) => {
    if (!rabbitholeId) return;
    try {
      await includeThingInRabbithole(rabbitholeId, tag.id.toString());
      refresh();
      showNotification({ message: `Added ${tag.name} to this Rabbithole` });
    } catch {
      showNotification({ message: "Could not add that tag", color: "red" });
    }
  };

  const createAndIncludeTag = async (name: string, description: string, color: string) => {
    const tag = await createTag(name, description, color);
    if (!tag) throw new Error("Could not create tag");
    await includeTag(tag);
  };

  const exportSeparateFiles = async () => {
    if (!rabbithole) return;
    setPreparingArchive(true);
    try {
      await downloadRabbitholeMarkdownArchive(rabbithole);
    } catch {
      showNotification({ message: "Could not prepare the Markdown archive", color: "red" });
    } finally {
      setPreparingArchive(false);
    }
  };

  const openSpyglass = (deep = false) => {
    if (!rabbithole) return;
    const query = deep
      ? `Synthesize the key themes, tensions, and next questions in ${rabbithole.name}`
      : `What should I know about ${rabbithole.name}?`;
    const params = new URLSearchParams({
      q: query,
      rabbithole: rabbithole.id.toString(),
      rabbitholeName: rabbithole.name,
    });
    if (deep) params.set("deep", "true");
    navigate(`/spyglass?${params.toString()}`);
  };

  if (loading && !rabbithole) {
    return (
      <PageWrapper>
        <TopBar />
        <Content>
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        </Content>
        <Nav />
      </PageWrapper>
    );
  }

  if (!rabbithole || rabbitholeError) {
    return (
      <PageWrapper>
        <TopBar />
        <Content>
          <Stack py="xl">
            <Text fw="bold">This Rabbithole could not be loaded.</Text>
            <Link to="/rabbitholes">Return to Rabbitholes</Link>
          </Stack>
        </Content>
        <Nav />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar startOpened={isDesktop}>
        <LeftSidebar.Open>
          <div className={styles.contextPanel}>
            <Card className={styles.gistCard} radius="lg" p="md">
              <Text className={styles.contextLabel}>The gist</Text>
              <Text size="sm">{contentSummary}</Text>
            </Card>

            <Stack gap="xl" mt="xl">
              <section>
                <Text className={styles.contextLabel}>Workspace</Text>
                <div className={styles.contextRows}>
                  <div className={styles.contextRow}>
                    <div>
                      <Text size="xs" c="dimmed">
                        Current scope
                      </Text>
                      <Text fw="bold">
                        {includedContent.length} item{includedContent.length === 1 ? "" : "s"}
                      </Text>
                    </div>
                    <Text size="xs" c="dimmed" ta="right">
                      {contentBreakdown || "Ready for a first seed"}
                    </Text>
                  </div>
                  <div className={styles.contextRow}>
                    <div>
                      <Text size="xs" c="dimmed">
                        Growth behavior
                      </Text>
                      <Text fw="bold" size="sm">
                        {rabbithole.recommendationPolicy?.mode === "auto-add"
                          ? "Auto-add strong matches"
                          : "Suggest possible matches"}
                      </Text>
                    </div>
                    <Text size="xs" c="dimmed" ta="right">
                      {Math.round(
                        (rabbithole.recommendationPolicy?.threshold ??
                          GLOBAL_SEMANTIC_SEARCH_THRESHOLD) * 100
                      )}
                      %+ match
                    </Text>
                  </div>
                </div>
              </section>
            </Stack>
          </div>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div
          className={`${styles.rabbithole} ${draggingOver ? styles.draggingOver : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDraggingOver(true);
          }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={(event) => void handleDrop(event)}
        >
          <Stack gap="xl">
            <PaperEyebrow
              withBack={false}
              left={
                <Group gap="xs" wrap="nowrap">
                  <Link to="/rabbitholes" className={styles.backLink}>
                    <ArrowLeftIcon />
                    Rabbitholes
                  </Link>
                  {saving && <Loader size="xs" />}
                </Group>
              }
              actions={[
                {
                  icon: SlidersHorizontalIcon,
                  name: "Manage Rabbithole",
                  run: openManager,
                },
              ]}
              right={
                <>
                  <Menu width={240} shadow="md" position="bottom-end" radius="md" withArrow>
                    <Menu.Target>
                      <ActionIcon
                        aria-label="Use with Spyglass"
                        radius="md"
                        variant="subtle"
                        color="gray"
                      >
                        <SpyglassIcon size={16} color="var(--mantine-color-dark-2)" />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Spyglass</Menu.Label>
                      <Menu.Item
                        leftSection={<SpyglassIcon size={14} color="var(--mantine-color-dark-2)" />}
                        onClick={() => openSpyglass()}
                      >
                        Explore this Rabbithole
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<SpyglassIcon size={14} color="var(--mantine-color-dark-2)" />}
                        onClick={() => openSpyglass(true)}
                      >
                        Deep Focus synthesis
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>

                  <Menu width={250} shadow="md" position="bottom-end" radius="md" withArrow>
                    <Menu.Target>
                      <ActionIcon
                        aria-label="Export Rabbithole"
                        radius="md"
                        variant="subtle"
                        color="gray"
                      >
                        <DownloadSimpleIcon weight="bold" />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Markdown</Menu.Label>
                      <CopyButton value={rabbitholeToMarkdown(rabbithole)}>
                        {({ copied, copy }) => (
                          <Menu.Item
                            leftSection={copied ? <CheckIcon /> : <CopySimpleIcon />}
                            onClick={copy}
                          >
                            {copied ? "Copied" : "Copy to clipboard"}
                          </Menu.Item>
                        )}
                      </CopyButton>
                      <Menu.Item
                        leftSection={<MarkdownLogoIcon />}
                        onClick={() => downloadRabbitholeMarkdown(rabbithole)}
                      >
                        Download as one file
                      </Menu.Item>
                      <Menu.Item
                        leftSection={preparingArchive ? <Loader size="xs" /> : <FileArchiveIcon />}
                        onClick={() => void exportSeparateFiles()}
                        disabled={preparingArchive}
                      >
                        Download separate files (.zip)
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>

                  <Menu width={200} shadow="md" position="bottom-end" radius="md" withArrow>
                    <Menu.Target>
                      <ActionIcon
                        aria-label="More options"
                        radius="md"
                        variant="subtle"
                        color="gray"
                      >
                        <DotsThreeVerticalIcon weight="bold" />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Generate from contents</Menu.Label>
                      <Menu.Item
                        leftSection={<SparkleIcon />}
                        disabled={!rabbithole.includes?.length || generatingField !== null}
                        onClick={() => void generateContext("name")}
                      >
                        Generate title
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<SparkleIcon />}
                        disabled={!rabbithole.includes?.length || generatingField !== null}
                        onClick={() => void generateContext("description")}
                      >
                        Generate description
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<TrashSimpleIcon />}
                        onClick={handleDelete}
                      >
                        Delete Rabbithole
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </>
              }
            />

            <div>
              <PaperTitle
                title={rabbithole.name}
                onUpdate={(name) => scheduleContextUpdate("name", name, true)}
                className={styles.editableTitle}
                needsGeneration={
                  Boolean(rabbithole.includes?.length) &&
                  ["Unnamed Rabbithole", "Untitled Rabbithole", ""].includes(rabbithole.name.trim())
                }
                onGenerate={() => void generateContext("name")}
                generationLabel="Generate a title from this Rabbithole's contents"
                isGenerating={generatingField === "name"}
                wasGenerated={Boolean(rabbithole.nameGeneratedAt)}
              />
              <div className={styles.descriptionEditor}>
                <Textarea
                  ref={descriptionRef}
                  value={description}
                  placeholder="Describe what you want this Rabbithole to explore..."
                  variant="unstyled"
                  autosize
                  minRows={2}
                  className={styles.description}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDescription(value);
                    if (value !== (rabbithole.description ?? "")) {
                      scheduleContextUpdate("description", value);
                    }
                  }}
                  onBlur={(event) => {
                    if (event.currentTarget.value !== (rabbithole.description ?? "")) {
                      scheduleContextUpdate("description", event.currentTarget.value, true);
                    }
                  }}
                />
                {Boolean(rabbithole.includes?.length) && !description.trim() && (
                  <Tooltip label="Generate a description from this Rabbithole's contents">
                    <ActionIcon
                      aria-label="Generate description"
                      variant="light"
                      size="md"
                      radius="md"
                      color="gray"
                      loading={generatingField === "description"}
                      onClick={() => void generateContext("description")}
                    >
                      <SparkleIcon size={14} weight="duotone" />
                    </ActionIcon>
                  </Tooltip>
                )}
              </div>

              <Group
                gap="xs"
                wrap={isMobile ? "nowrap" : "wrap"}
                className={isMobile ? styles.mobileTags : styles.tags}
              >
                {includedTags.map((tag) => (
                  <PaperTag
                    key={tag.id.toString()}
                    tag={tag}
                    state="applied"
                    active
                    onRemove={(tagId) => void removeThing(tagId)}
                  />
                ))}
                <TagPicker
                  triggerLabel="Add tag"
                  onSelectExisting={(tag) => void includeTag(tag)}
                  onCreateNew={createAndIncludeTag}
                  omitIds={includedTags.map((tag) => tag.id.toString())}
                />
              </Group>
            </div>

            {isMobile && (
              <div className={styles.summary}>
                <Text size="xs" fw="bold" tt="uppercase" c="dimmed">
                  Content summary
                </Text>
                <Text mt="xs">{contentSummary}</Text>
              </div>
            )}

            {displayedThings.length ? (
              <PaperThings
                things={displayedThings}
                modes={[
                  { value: "grid", icon: SquaresFourIcon },
                  { value: "list", icon: ListIcon },
                ]}
                defaultMode="grid"
                storageKey={`rabbithole:${rabbitholeId}:contents`}
                mobileGridColumns={2}
              />
            ) : (
              <Stack align="center" className={styles.empty}>
                <Text fw="bold">Nothing here yet</Text>
                <Text c="dimmed" ta="center">
                  Add a seed from Manage, or drop an item here to start building context.
                </Text>
                <PaperButton leftSection={<PlusIcon />} onClick={openManager}>
                  Add a seed
                </PaperButton>
              </Stack>
            )}
          </Stack>
        </div>
      </Content>
      <Nav
        rabbitholeAction={
          !isEntered
            ? { label: "Enter Rabbithole", onClick: () => setEntered(rabbithole) }
            : undefined
        }
      />
      <RightSidebar startOpened={isDesktop}>
        <RightSidebar.PersistentOpen>
          <ManageRabbithole
            rabbithole={rabbithole}
            opened={!isMobile}
            onClose={() => setRightSidebarMode("collapsed")}
            onChanged={refresh}
            variant="panel"
            focusRequest={managerFocusRequest}
            sharedSuggestions={suggestions}
            onSuggestionsChanged={setSuggestions}
          />
        </RightSidebar.PersistentOpen>
      </RightSidebar>

      <ManageRabbithole
        rabbithole={rabbithole}
        opened={isMobile && manageOpened}
        onClose={() => setManageOpened(false)}
        onChanged={refresh}
        focusRequest={managerFocusRequest}
        sharedSuggestions={suggestions}
        onSuggestionsChanged={setSuggestions}
      />
    </PageWrapper>
  );
}
