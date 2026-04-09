import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./Source.module.scss";
import useFetch from "@core/hooks/useFetch";
import {
  ActionIcon,
  Blockquote,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "@mantine/hooks";

import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import ContentWide from "@core/design/components/Layout/ContentWide";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { Tabs } from "@core/design/components/Layout/Utils/Tabs";
import PaperEyebrow from "@/core/design/components/Paper/PaperEyebrow/PaperEyebrow";
import { PaperTitle } from "@/core/design/components/Paper/PaperTitle/PaperTitle";
import PaperDrawer from "@core/design/components/Paper/PaperDrawer";

import { ViewerMap } from "@domains/knowledge/components/Files/Viewers";
import { useLayout } from "@/contexts/LayoutContext";
import { useLandscape } from "@/contexts/LandscapeContext";
import { ISource, ISourceForm, ISourceReference } from "../../../../../app/database/models/source";
import Search from "@domains/discovery/components/Search/Search";
import ConnectionManager from "@/core/design/components/Display/Interactions/Connections/ConnectionManager";
import TagsManager from "@/core/design/components/Display/Interactions/Tags/TagsManager";
import { updateSource } from "@domains/knowledge/utils/sources";
import { SourceProvider, useSource } from "./SourceContext";
import useConnectable from "@domains/knowledge/hooks/useConnectable";
import usePins from "@domains/knowledge/hooks/usePins";

import {
  ArrowLeftIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FileIcon,
  FileMagnifyingGlassIcon,
  IntersectSquareIcon,
  PushPinIcon,
  SparkleIcon,
  TextAlignLeftIcon,
  TrashSimpleIcon,
  UniteSquareIcon,
} from "@phosphor-icons/react";
import PaperExcerpt from "@/core/design/components/Paper/Excerpt/PaperExcerpt";

export default function Source() {
  const { i18n } = useLingui();
  const { sourceId } = useParams();
  const navigate = useNavigate();

  const isDeletingRef = useRef(false);

  const { data: source, load: loadSource } = useFetch<undefined, ISource>({
    url: `/sources/${sourceId}`,
  });

  useEffect(() => {
    loadSource();
  }, []);

  const [targetExcerptId, setTargetExcerptId] = useState<string>();
  const [queryExcerptId, setQueryExcerptId] = useState<string>();
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qId = searchParams.get("excerptId");
    if (qId) {
      setQueryExcerptId(qId);
    }
  }, [searchParams.get("excerptId"), setQueryExcerptId]);
  useEffect(() => {
    if (queryExcerptId) {
      setTargetExcerptId(queryExcerptId);
    }
  }, [queryExcerptId]);

  const {
    connectable: {
      viewing: { set: setViewing },
    },
  } = useLandscape();

  useEffect(() => {
    if (source) {
      setViewing({ ...source, type: "source" });
    }
    return () => setViewing(null);
  }, [source]);

  const file = source?.references as ISourceReference;

  const Viewer = useMemo(() => {
    if (file?.mimeType && file.mimeType in ViewerMap) {
      return lazy(ViewerMap[file.mimeType]);
    }
    return null;
  }, [file]);

  const { connect, isConnected } = useConnectable({
    connectable: source ? { ...source, type: "source" } : null,
  });

  const {
    elements: {
      leftSidebar: {
        mode: { get: leftMode },
      },
      rightSidebar: {
        mode: { get: rightMode },
      },
    },
  } = useLayout();

  const leftModeToClass: Record<string, string> = {
    open: styles.leftOpen,
    collapsed: styles.leftCollapsed,
    compact: styles.leftCompact,
    hovering: `${styles.leftOpen} ${styles.leftHovering}`,
  };

  const rightModeToClass: Record<string, string> = {
    open: styles.rightOpen,
    collapsed: styles.rightCollapsed,
    compact: styles.rightCompact,
    hovering: `${styles.rightOpen} ${styles.rightHovering}`,
  };

  const leftModeClass = leftModeToClass[leftMode];
  const rightModeClass = rightModeToClass[rightMode];

  const debouncedUpdate = useDebouncedCallback(async (update: Partial<ISourceForm>) => {
    if (sourceId) {
      updateSource(sourceId, update);
    }
  }, 200);

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      debouncedUpdate({ [field]: value });
    } catch (error) {
      showNotification({
        title: i18n._(t`Something went wrong`),
        message: i18n._(t`Something went wrong updating the field...`),
        color: "red",
      });
      console.error("Couldn't update field: ", error);
    }
  };

  const { load: triggerDeleteSource, loading: loadingDelete } = useFetch({
    url: `/sources/${sourceId}`,
    dependencies: [sourceId],
    method: "DELETE",
    runOnMount: false,
    onSuccess: () => {
      navigate(-1);
      showNotification({
        title: i18n._(t`Success`),
        message: i18n._(t`Source deleted successfully`),
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

  const handleDeleteSource = useCallback(() => {
    if (loadingDelete) return;

    modals.openConfirmModal({
      title: i18n._(t`Delete this source?`),
      centered: true,
      children: (
        <Text size="sm">
          <Trans>This action cannot be undone. All associated data will be lost.</Trans>
        </Text>
      ),
      labels: { confirm: i18n._(t`Delete Source`), cancel: i18n._(t`Cancel`) },
      confirmProps: { color: "red" },
      onConfirm: () => {
        isDeletingRef.current = true;
        triggerDeleteSource();
      },
    });
  }, [loadingDelete, triggerDeleteSource]);

  const { load: requestAnalysis, loading: loadingAnalysis } = useFetch({
    url: `/sources/${source?.id.toString()}/analyze`,
    onFinally: () => {
      loadSource();
    },
  });

  return (
    <SourceProvider source={source} excerptId={targetExcerptId}>
      <PageWrapper>
        <TopBar />
        <LeftSidebar>
          <LeftSidebar.Open>
            <Tabs defaultValue="context">
              <Tabs.List>
                <Tabs.Tab value="context">
                  <Group gap="xs">
                    <IntersectSquareIcon weight="fill" size={14} />
                    <Trans>Context</Trans>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab value="analysis">
                  <Group gap="xs">
                    <FileMagnifyingGlassIcon />
                    <Trans>Analysis</Trans>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab value="excerpts">
                  <Group gap="xs">
                    <TextAlignLeftIcon />
                    <Trans>Excerpts</Trans>
                  </Group>
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="context">
                <Stack gap="md" mt="md">
                  {!source?.analysis && (
                    <Text size="xs" c="dimmed">
                      <Trans>This source hasn't been analyzed.</Trans>
                    </Text>
                  )}
                  {source?.analysis && (
                    <Card
                      radius="lg"
                      p="sm"
                      styles={{
                        root: {
                          backgroundColor: "var(--mantine-color-dark-8) !important",
                          border: "1px solid var(--mantine-color-dark-7)",
                        },
                      }}
                    >
                      <Text fw="bold" c="dimmed" size="sm" mb={4}>
                        <Trans>The Gist</Trans>
                      </Text>
                      <Text size="sm">{source.analysis.headline}</Text>
                    </Card>
                  )}
                  {!!source && <ConnectionManager connectable={{ ...source, type: "source" }} />}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="analysis">
                <AnalysisBlock
                  analysis={source?.analysis}
                  source={source}
                  loading={loadingAnalysis}
                  onRequestAnalysis={requestAnalysis}
                />
              </Tabs.Panel>

              <Tabs.Panel value="excerpts">
                <ExcerptsPanel
                  setTarget={(excerptId) => {
                    setTargetExcerptId(excerptId);
                  }}
                />
              </Tabs.Panel>
            </Tabs>
          </LeftSidebar.Open>
        </LeftSidebar>

        <ContentWide>
          <div className={styles.fileView}>
            <Stack gap="md">
              <Stack>
                {source && (
                  <SourceTools
                    source={source}
                    onDelete={handleDeleteSource}
                    loadingDelete={loadingDelete}
                    onRequestAnalysis={requestAnalysis}
                    loadingAnalysis={loadingAnalysis}
                  />
                )}

                <Group gap="xs">
                  {source && (
                    <PaperTitle
                      title={source.displayName || i18n._(t`Untitled Source`)}
                      onUpdate={(newTitle) => handleFieldUpdate("displayName", newTitle)}
                      canEdit={true}
                    />
                  )}
                </Group>
              </Stack>

              {!!source && (
                <TagsManager connectable={{ ...source, type: "source" }} maxSuggested={2} />
              )}

              {file && (
                <div className={`${styles.viewer} ${leftModeClass} ${rightModeClass}`}>
                  <Suspense
                    fallback={
                      <Text size="xs" c="dimmed">
                        <Trans>Loading viewer...</Trans>
                      </Text>
                    }
                  >
                    {Viewer ? (
                      <Viewer fileId={file.id.toString()} withinSource />
                    ) : (
                      <Text>
                        <Trans>No viewer available for this type of file :/</Trans>
                      </Text>
                    )}
                  </Suspense>
                </div>
              )}
            </Stack>
          </div>
        </ContentWide>

        <Nav />
        <RightSidebar>
          <RightSidebar.Open>
            <Stack>
              {!!file && (
                <Card
                  radius="lg"
                  p="xs"
                  styles={{
                    root: {
                      backgroundColor: "var(--mantine-color-dark-8) !important",
                      border: "1px solid var(--mantine-color-dark-7)",
                    },
                  }}
                >
                  <Group>
                    <Link to={`/file/${file.id.toString()}`}>
                      <Button
                        variant="light"
                        color="gray"
                        size="xs"
                        radius="md"
                        leftSection={<FileIcon />}
                      >
                        <Trans>Go to file</Trans>
                      </Button>
                    </Link>
                  </Group>
                </Card>
              )}
              <Search
                resultActions={[
                  (thing) => {
                    return {
                      id: "connect",
                      label: i18n._(t`Connect`),
                      onClick: () => {
                        connect(thing.id.toString());
                      },
                      disabled: isConnected(thing.id.toString()),
                    };
                  },
                ]}
              />
            </Stack>
          </RightSidebar.Open>
        </RightSidebar>
      </PageWrapper>
    </SourceProvider>
  );
}

// --- SourceTools Component ---
interface ISourceTools {
  source: ISource;
  onDelete: () => void;
  loadingDelete: boolean;
  onRequestAnalysis: () => void;
  loadingAnalysis: boolean;
}

function SourceTools({
  source,
  onDelete,
  loadingDelete,
  onRequestAnalysis,
  loadingAnalysis,
}: ISourceTools) {
  const { i18n } = useLingui();
  const { isMobile } = useLayout();
  const navigate = useNavigate();
  const { thingIsPinned, togglePin } = usePins();

  const [pinning, setPinning] = useState(false);
  const [managingConnections, setManagingConnections] = useState(false);

  const isPinned = thingIsPinned(source.id);
  const size = isMobile ? "lg" : "md";
  const radius = "md";

  const handleTogglePin = async () => {
    try {
      setPinning(true);
      await togglePin(source.id.toString());
    } finally {
      setPinning(false);
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
            weight: isPinned ? "fill" : "bold",
          },
          {
            icon: UniteSquareIcon,
            name: i18n._(t`Manage Connections`),
            run: () => setManagingConnections(true),
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
                    aria-label={i18n._(t`More options`)}
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
                <Tooltip label={i18n._(t`Delete Source`)}>
                  <Menu.Item
                    color="red"
                    leftSection={loadingDelete ? <Loader size="xs" /> : <TrashSimpleIcon />}
                    onClick={onDelete}
                    disabled={loadingDelete}
                  >
                    <Trans>Delete</Trans>
                  </Menu.Item>
                </Tooltip>
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />

      {isMobile && (
        <>
          <PaperDrawer
            title={i18n._(t`Manage Connections`)}
            opened={managingConnections}
            onClose={() => setManagingConnections(false)}
          >
            <ConnectionManager connectable={{ ...source, type: "source" }} />
          </PaperDrawer>
        </>
      )}
    </div>
  );
}

// --- Subcomponents ---
interface IAnalysisBlockProps {
  analysis?: ISource["analysis"];
  source?: ISource;
  loading: boolean;
  onRequestAnalysis: () => void;
}

function AnalysisBlock({ analysis, source, loading, onRequestAnalysis }: IAnalysisBlockProps) {
  const { i18n } = useLingui();
  const [abstractOpen, setAbstractOpen] = useState(false);

  const abstract = analysis?.abstract ?? "";

  const getTruncatedAbstract = () => {
    if (!abstract) return "";
    const maxLength = 200;
    return abstract.length > maxLength ? `${abstract.slice(0, maxLength)}...` : abstract;
  };

  if (!analysis) {
    return (
      <Stack mt="md">
        <Text size="sm" c="dimmed">
          <Trans>This source hasn't been analyzed.</Trans>
        </Text>
        <Text size="xs" c="dark.3">
          <Trans>
            Analysis uses third-party AI models in accordance with our{" "}
            <a href="https://www.noeko.app/privacy">Privacy Policy</a>.
          </Trans>
        </Text>
        <Button
          variant="light"
          onClick={onRequestAnalysis}
          disabled={loading}
          leftSection={loading ? <Loader size="sm" color="white" /> : ""}
          size="sm"
          fullWidth
          color="gray"
          rightSection={<EyeIcon />}
        >
          {loading ? i18n._(t`Analyzing...`) : i18n._(t`Analyze source`)}
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <Stack mt="md">
        <Text size="xs" c="dark.3">
          <Trans>
            Analysis uses third-party AI models in accordance with our{" "}
            <a href="https://www.noeko.app/privacy">Privacy Policy</a>.
          </Trans>
        </Text>
        <Card
          radius="lg"
          p="sm"
          styles={{
            root: {
              backgroundColor: "var(--mantine-color-dark-8) !important",
              border: "1px solid var(--mantine-color-dark-7)",
            },
          }}
        >
          <Text fw="bold" c="dimmed" size="sm" mb={4}>
            <Trans>The Gist</Trans>
          </Text>
          <Text size="sm">{analysis.headline}</Text>
        </Card>
        <Card
          radius="lg"
          p="sm"
          styles={{
            root: {
              backgroundColor: "var(--mantine-color-dark-8) !important",
              border: "1px solid var(--mantine-color-dark-7)",
            },
          }}
        >
          <Stack gap="md">
            <Text fw="bold" c="dimmed" size="sm" mb={4}>
              <Trans>Abstract</Trans>
            </Text>
            <Text size="sm">{getTruncatedAbstract()}</Text>
            {abstract.length > getTruncatedAbstract().length && (
              <Group>
                <Button
                  variant="light"
                  onClick={() => setAbstractOpen(true)}
                  color="gray"
                  size="xs"
                >
                  <Trans>More...</Trans>
                </Button>
              </Group>
            )}
          </Stack>
        </Card>
      </Stack>

      <Drawer
        opened={abstractOpen}
        onClose={() => setAbstractOpen(false)}
        position="left"
        offset="24px"
        radius="lg"
        title={
          <Group gap="xs">
            <SparkleIcon />
            <Text>
              <Trans>Abstract</Trans>
            </Text>
          </Group>
        }
      >
        <Text size="md">{analysis?.abstract}</Text>
      </Drawer>
    </>
  );
}

interface IExcerptsPanelProps {
  setTarget: (excerptId: string) => void;
}

function ExcerptsPanel({ setTarget }: IExcerptsPanelProps) {
  const {
    excerpts: { all },
  } = useSource();
  const handleSetExcerpt = (excerptId: string) => {
    setTarget(excerptId);
  };

  return (
    <Stack gap="sm" mt="md">
      {!all.length && (
        <Text size="sm" c="dimmed">
          <Trans>No excerpts yet, try highlighting some text :)</Trans>
        </Text>
      )}
      {all.map((excerpt, index) => {
        return (
          <PaperExcerpt
            key={excerpt.id.toString()}
            excerpt={excerpt}
            onClick={(excerpt) => {
              setTarget(excerpt.id.toString());
            }}
          />
        );
      })}
    </Stack>
  );
}
