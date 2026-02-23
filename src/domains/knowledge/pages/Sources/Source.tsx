import { Link, useNavigate, useParams } from "react-router";
import styles from "./Source.module.scss";
import useFetch from '@core/hooks/useFetch';
import {
  ActionIcon,
  Blockquote,
  Box,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollAreaAutosize,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import PageWrapper from '@/components/Layout/PageWrapper';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import ContentWide from '@core/design/components/Layout/ContentWide';
import StatusBar from '@core/design/components/Layout/Bottom';
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ViewerMap } from '@domains/knowledge/components/Files/Viewers';
import { useLayout } from '@/contexts/LayoutContext';
import {
  CaretLeftIcon,
  Eye,
  EyeIcon,
  FileIcon,
  FileMagnifyingGlassIcon,
  IntersectSquareIcon,
  SparkleIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { ISource, ISourceForm, ISourceReference } from '../../../../../app/database/models/source';
import Search from '@domains/discovery/components/Search/Search';
import { Tabs } from '@core/design/components/Layout/Utils/Tabs';
import ConnectionManager from '@/components/Display/Interactions/Connections/ConnectionManager';
import { useLandscape } from '@/contexts/LandscapeContext';
import { useDebouncedCallback } from "@mantine/hooks";
import { updateSource } from '@domains/knowledge/utils/sources';
import { showNotification } from "@mantine/notifications";
import { SourceProvider, useSource } from "./SourceContext";
import useConnectable from '@domains/knowledge/hooks/useConnectable';
import TagsManager from '@/components/Display/Interactions/Tags/TagsManager';
import { useSpyglassService } from '@domains/discovery/hooks/useSpyglassService';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';

export default function Source() {
  const { sourceId } = useParams();

  const navigate = useNavigate();

  const { data: source, load: loadSource } = useFetch<undefined, ISource>({
    url: `/sources/${sourceId}`,
  });

  useEffect(() => {
    loadSource();
  }, []);

  const {
    connectable: {
      viewing: { set: setViewing },
    },
  } = useLandscape();

  useEffect(() => {
    if (source) {
      setViewing({
        ...source,
        type: "source",
      });
    }

    return () => {
      setViewing(null);
    };
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

  const leftModeToClass: Record<typeof leftMode, string> = {
    open: styles.leftOpen,
    collapsed: styles.leftCollapsed,
    compact: styles.leftCompact,
    hovering: `${styles.leftOpen} ${styles.leftHovering}`,
  };

  const rightModeToClass: Record<typeof rightMode, string> = {
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
      debouncedUpdate({
        [field]: value,
      });
    } catch (error) {
      showNotification({
        title: "Something went wrong",
        message: "Something went wrong updating the field...",
      });
      console.error("Couldn't update field: ", error);
    }
  };

  return (
    <SourceProvider source={source}>
      <PageWrapper>
        <TopBar />
        <LeftSidebar>
          <LeftSidebar.Open>
            <Tabs defaultValue="context">
              <Tabs.List>
                <Tabs.Tab value="context">
                  <Group gap="xs">
                    <IntersectSquareIcon weight="fill" size={14} />
                    Context
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab value="analysis">
                  <Group gap="xs">
                    <FileMagnifyingGlassIcon />
                    Analysis
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab value="excerpts">
                  <TextAlignLeftIcon />
                  Excerpts
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="context">
                <Stack gap="md">
                  {!source?.analysis && (
                    <>
                      <Text size="xs" c="dimmed">
                        This source hasn't been analyzed.
                      </Text>
                    </>
                  )}
                  {source?.analysis && (
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
                      <Text size="sm">{source.analysis.headline}</Text>
                    </Card>
                  )}
                  {!!source && (
                    <TagsManager connectable={{ ...source, type: "source" }} maxSuggested={2} />
                  )}
                  {!!source && (
                    <ConnectionManager
                      connectable={{
                        ...source,
                        type: "source",
                      }}
                    />
                  )}
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="analysis">
                <AnalysisBlock
                  analysis={source?.analysis}
                  source={source}
                  reloadSource={() => {
                    loadSource();
                  }}
                />
              </Tabs.Panel>
              <Tabs.Panel value="excerpts">
                <ExcerptsPanel />
              </Tabs.Panel>
            </Tabs>
          </LeftSidebar.Open>
        </LeftSidebar>
        <ContentWide>
          <div className={styles.fileView}>
            <Group gap="xs">
              <ActionIcon
                onClick={() => {
                  navigate(-1);
                }}
                color="gray"
                variant="subtle"
                size="sm"
              >
                <CaretLeftIcon weight="bold" />
              </ActionIcon>
              <Title
                contentEditable
                onBlur={(e) => {
                  handleFieldUpdate("displayName", e.currentTarget.innerText);
                }}
                dangerouslySetInnerHTML={{
                  __html: source?.displayName || "",
                }}
              />
            </Group>
            {file && (
              <div className={`${styles.viewer} ${leftModeClass} ${rightModeClass}`}>
                <Suspense
                  fallback={
                    <Text size="xs" c="dimmed">
                      Loading viewer...
                    </Text>
                  }
                >
                  {Viewer ? (
                    <Viewer fileId={file.id.toString()} />
                  ) : (
                    <Text>No viewer available for this type of file :/</Text>
                  )}
                </Suspense>
              </div>
            )}
          </div>
        </ContentWide>
        <Nav />
        <RightSidebar>
          <RightSidebar.Open>
            <Stack>
              {!!file && (
                <Card
                  radius="lg"
                  p={"xs"}
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
                        Go to file
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
                      label: "Connect",
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

interface IAnalysisBlockProps {
  analysis?: ISource["analysis"];
  source?: ISource;
  reloadSource: () => void;
}
function AnalysisBlock({ analysis, source, reloadSource }: IAnalysisBlockProps) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [findingsOpen, setFindingsOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  const abstract = analysis?.abstract ?? "";

  const getTruncatedAbstract = () => {
    if (!abstract) return "";
    const maxLength = 200;
    return abstract.length > maxLength ? `${abstract.slice(0, maxLength)}...` : abstract;
  };

  const { load: requestAnalysis, loading: loadingAnalysis } = useFetch({
    url: `/sources/${source?.id.toString()}/analyze`,
    onFinally: () => {
      reloadSource();
    },
  });

  const handleRequestAnalysis = () => {
    requestAnalysis();
  };

  if (!analysis) {
    return (
      <>
        <Stack>
          <Text size="sm" c="dimmed">
            This source hasn't been analyzed.
          </Text>
          <Text size="xs" c="dark.3">
            Analysis uses third-party AI models in accordance with our{" "}
            <a href="https://www.noeko.app/privacy">Privacy Policy</a>.
          </Text>
          <Button
            variant="light"
            onClick={() => {
              handleRequestAnalysis();
            }}
            disabled={loadingAnalysis}
            leftSection={loadingAnalysis ? <Loader size="sm" color="white" /> : ""}
            size="sm"
            fullWidth
            color="gray"
            rightSection={<EyeIcon />}
          >
            {loadingAnalysis ? "Analyzing..." : "Analyze source"}
          </Button>
        </Stack>
      </>
    );
  }

  return (
    <>
      <Stack>
        <Text size="xs" c="dark.3">
          Analysis uses third-party AI models in accordance with our{" "}
          <a href="https://www.noeko.app/privacy">Privacy Policy</a>.
        </Text>
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
          <Text size="sm">{analysis.headline}</Text>
        </Card>
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
          <Stack gap="md">
            <Text fw={"bold"} c="dimmed" size="sm" mb={4}>
              Abstract
            </Text>
            <Text size="sm">{getTruncatedAbstract()}</Text>
            {abstract.length > getTruncatedAbstract().length && (
              <Group>
                <Button
                  variant="light"
                  onClick={() => {
                    setAbstractOpen(true);
                  }}
                  color="gray"
                  size="xs"
                >
                  More...
                </Button>
              </Group>
            )}
          </Stack>
        </Card>
      </Stack>

      <Drawer
        opened={abstractOpen}
        onClose={() => {
          setAbstractOpen(false);
        }}
        position="left"
        offset="24px"
        radius="lg"
        title={
          <Group gap="xs">
            <SparkleIcon />
            <Text>Abstract</Text>
          </Group>
        }
      >
        <Text size="md">{analysis?.abstract}</Text>
      </Drawer>
    </>
  );
}

function ExcerptsPanel() {
  const {
    excerpts: { all },
  } = useSource();

  return (
    <div>
      <Stack gap="sm">
        <Text size="sm" c="dark.4" fw="bold">
          <Group gap="xs">
            <TextAlignLeftIcon weight="bold" />
            EXCERPTS
          </Group>
        </Text>
        {!all.length && (
          <Text size="sm" c="dimmed">
            No excerpts yet, try highlighting some text :)
          </Text>
        )}
        {all.map((excerpt) => {
          return (
            <Stack gap="xs">
              <Blockquote color="gray" p="xs">
                <Text size="sm">{excerpt.sourceText}</Text>
              </Blockquote>
              {excerpt.note && <Text size="sm">{excerpt.note}</Text>}
            </Stack>
          );
        })}
      </Stack>
    </div>
  );
}
