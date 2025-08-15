import { Link, useNavigate, useParams } from "react-router";
import styles from "./Source.module.scss";
import useFetch from "../../hooks/useFetch";
import {
  ActionIcon,
  Blockquote,
  Button,
  Card,
  Center,
  Drawer,
  Flex,
  Grid,
  Group,
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
import { lazy, Suspense, useMemo, useState } from "react";
import { ViewerMap } from "../../components/Display/Files/Viewers";
import { useLayout } from "../../contexts/LayoutContext";
import {
  CaretLeftIcon,
  FileIcon,
  FileMagnifyingGlassIcon,
  IntersectSquareIcon,
  MagnifyingGlassIcon,
  Sparkle,
  SparkleIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { ISource, ISourceReference } from "../../../app/database/models/source";
import Search from "../../components/Search/Search";
import { markdownToHtml } from "../../utils/formatting";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";

export default function Source() {
  const { sourceId } = useParams();

  const navigate = useNavigate();

  const { data: source } = useFetch<undefined, ISource>({
    url: `/sources/${sourceId}`,
    runOnMount: true,
  });

  const file = source?.references as ISourceReference;

  const Viewer = useMemo(() => {
    if (file?.mimeType && file.mimeType in ViewerMap) {
      return lazy(ViewerMap[file.mimeType]);
    }
    return null;
  }, [file]);

  console.log("Analysis: ", source?.analysis);

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
            <Tabs.Panel value="context">This is context</Tabs.Panel>
            <Tabs.Panel value="analysis">
              {source?.analysis && (
                <AnalysisBlock analysis={source?.analysis} />
              )}
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
            <Title order={3}>{source?.displayName}</Title>
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
  analysis: ISource["analysis"];
}
function AnalysisBlock({ analysis }: IAnalysisBlockProps) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [findingsOpen, setFindingsOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  const abstract = analysis?.abstract ?? "";
  const outline = analysis?.outline ?? [];
  const findings = analysis?.findings ?? [];

  const getTruncatedAbstract = () => {
    if (!abstract) return "";
    const maxLength = 200;
    return abstract.length > maxLength
      ? `${abstract.slice(0, maxLength)}...`
      : abstract;
  };

  const Outline = outline.map((item) => {
    return (
      <Paper key={item.summary}>
        <Text fw="bold" c="dimmed" size="xs">
          {item.section}
        </Text>
        <Text size="xs">{item.summary}</Text>
      </Paper>
    );
  });

  const Findings = findings.map((finding) => {
    return (
      <Paper key={finding.analysis}>
        <Blockquote color="gray" p="xs" mb="xs">
          <Text
            size="sm"
            p="0"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(finding.excerpt),
            }}
          />
        </Blockquote>
        <Text size="sm">{finding.analysis}</Text>
      </Paper>
    );
  });

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
          <Text fw="bold" c="dimmed" size="xs">
            {analysis?.headline}
          </Text>
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
              Outline
            </Text>
            <ScrollAreaAutosize mah="25vh">
              <Stack>{Outline}</Stack>
            </ScrollAreaAutosize>
            <Group>
              <Button
                variant="light"
                onClick={() => {
                  setOutlineOpen(true);
                }}
                color="gray"
                size="xs"
              >
                More...
              </Button>
            </Group>
          </Stack>
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
              Findings
            </Text>
            <ScrollAreaAutosize mah="25vh">
              <Stack>{Findings}</Stack>
            </ScrollAreaAutosize>
            <Group>
              <Button
                variant="light"
                onClick={() => {
                  setFindingsOpen(true);
                }}
                color="gray"
                size="xs"
              >
                More...
              </Button>
            </Group>
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
        <Text size="sm">{analysis?.abstract}</Text>
      </Drawer>
      <Drawer
        opened={outlineOpen}
        onClose={() => {
          setOutlineOpen(false);
        }}
        position="left"
        offset="24px"
        radius="lg"
        title={
          <Group gap="xs">
            <TextAlignLeftIcon />
            <Text>Outline</Text>
          </Group>
        }
      >
        <Stack>{Outline}</Stack>
      </Drawer>
      <Drawer
        opened={findingsOpen}
        onClose={() => {
          setFindingsOpen(false);
        }}
        position="left"
        offset="24px"
        radius="lg"
        title={
          <Group gap="xs">
            <MagnifyingGlassIcon />
            <Text>Findings</Text>
          </Group>
        }
      >
        <Stack>{Findings}</Stack>
      </Drawer>
    </>
  );
}
