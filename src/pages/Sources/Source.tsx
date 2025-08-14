import { Link, useNavigate, useParams } from "react-router";
import styles from "./Source.module.scss";
import useFetch from "../../hooks/useFetch";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import ContentWide from "../../components/UI/Layout/ContentWide";
import StatusBar from "../../components/UI/Layout/Bottom";
import { lazy, Suspense, useMemo } from "react";
import { ViewerMap } from "../../components/Display/Files/Viewers";
import { useLayout } from "../../contexts/LayoutContext";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { ISource, ISourceReference } from "../../../app/database/models/source";
import Search from "../../components/Search/Search";

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
                Abstract
              </Text>
              <Text size="sm">{source?.analysis?.abstract}</Text>
            </Card>
          </Stack>
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
                    <Button variant="light" color="gray" size="xs" radius="md">
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
