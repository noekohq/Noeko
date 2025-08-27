import { Link, useNavigate, useParams } from "react-router";
import styles from "./Source.module.scss";
import useFetch from "../../hooks/useFetch";
import {
  ActionIcon,
  Blockquote,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollAreaAutosize,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import ContentWide from "../../components/UI/Layout/ContentWide";
import StatusBar from "../../components/UI/Layout/Bottom";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ViewerMap } from "../../components/Display/Files/Viewers";
import { useLayout } from "../../contexts/LayoutContext";
import {
  CaretLeftIcon,
  EyeIcon,
  FileIcon,
  FileMagnifyingGlassIcon,
  IntersectSquareIcon,
  MagnifyingGlassIcon,
  Sparkle,
  SparkleIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import {
  ISource,
  ISourceForm,
  ISourceReference,
} from "../../../app/database/models/source";
import Search from "../../components/Search/Search";
import { markdownToHtml } from "../../utils/formatting";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import ConnectionManager from "../../components/Display/Interactions/Connections/ConnectionManager";
import { useLandscape } from "../../contexts/LandscapeContext";
import { useDebouncedCallback } from "@mantine/hooks";
import { updateSource } from "../../utils/sources";
import { showNotification } from "@mantine/notifications";

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

  const debouncedUpdate = useDebouncedCallback(
    async (update: Partial<ISourceForm>) => {
      if (sourceId) {
        updateSource(sourceId, update);
      }
    },
    200,
  );

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
    <PageWrapper>
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
            </Tabs.List>
            <Tabs.Panel value="context">
              {!source?.analysis && (
                <Text size="xs" c="dimmed">
                  This source has not been analyzed.
                </Text>
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
                <ConnectionManager
                  connectable={{
                    ...source,
                    type: "source",
                  }}
                />
              )}
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
              dangerouslySetInnerHTML={{ __html: source?.displayName || "" }}
            />
          </Group>
          {file && (
            <div
              className={`${styles.viewer} ${leftModeClass} ${rightModeClass}`}
            >
              <Suspense
                fallback={
                  <Text size="xs" c="dimmed">
                    Loading viewer...
                  </Text>
                }
              >
                {Viewer ? (
                  <Viewer fileId={file.id} />
                ) : (
                  <Text>No viewer available for this type of file :/</Text>
                )}
              </Suspense>
            </div>
          )}
        </div>
      </ContentWide>
      <StatusBar />
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
            <Search />
          </Stack>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}

interface IAnalysisBlockProps {
  analysis?: ISource["analysis"];
  source?: ISource;
  reloadSource: () => void;
}
function AnalysisBlock({
  analysis,
  source,
  reloadSource,
}: IAnalysisBlockProps) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [findingsOpen, setFindingsOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  const abstract = analysis?.abstract ?? "";

  const getTruncatedAbstract = () => {
    if (!abstract) return "";
    const maxLength = 200;
    return abstract.length > maxLength
      ? `${abstract.slice(0, maxLength)}...`
      : abstract;
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
          <Button
            variant="light"
            onClick={() => {
              handleRequestAnalysis();
            }}
            disabled={loadingAnalysis}
            leftSection={
              loadingAnalysis ? <Loader size="sm" color="white" /> : ""
            }
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
