import { Link, useNavigate, useParams } from "react-router";
import styles from "./File.module.scss";
import useFetch from "../../hooks/useFetch";
import { IUserFile } from "../../../app/database/models/userfile";
import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import ContentWide from "../../components/UI/Layout/ContentWide";
import StatusBar from "../../components/UI/Layout/Bottom";
import { handleFileDownload } from "../../utils/userfiles";
import { lazy, Suspense, useCallback, useMemo } from "react";
import { ViewerMap } from "./Viewers";
import { useLayout } from "../../contexts/LayoutContext";
import { CaretLeftIcon } from "@phosphor-icons/react";

export default function UserFile() {
  const { fileId } = useParams();

  const navigate = useNavigate();

  const { data: file } = useFetch<undefined, IUserFile>({
    url: `/files/${fileId}`,
    runOnMount: true,
  });

  const handleDownload = useCallback(async () => {
    try {
      if (file) {
        handleFileDownload(file);
      } else {
        showNotification({
          title: "No file to download.",
          message: "Can't download non-existent file.",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error fetching file: ", error);
      showNotification({
        title: "Something went wrong",
        message: "Couldn't download file",
        color: "red",
      });
    }
  }, [file]);

  const { load: deleteFile, loading: deletingFile } = useFetch<
    undefined,
    undefined
  >({
    url: `/files/${fileId}`,
    method: "DELETE",
    onSuccess: () => {
      console.info("File deleted");
      showNotification({
        title: "File deleted successfully",
        message: "The file has been deleted successfully.",
      });
      navigate("/sources");
    },
    onError: (error) => {
      console.error("Error deleting file", error);
      showNotification({
        title: "Error deleting file",
        message: "An error occurred while deleting the file.",
        color: "red",
      });
    },
  });

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete file",
      children: (
        <Text size="sm">Are you sure you want to delete this file?</Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: () => deleteFile(),
      confirmProps: {
        color: "red",
      },
    });
  };

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

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>Insights and such</LeftSidebar.Open>
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
            <Title order={3}>{file?.originalFileName}</Title>
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
          <Flex justify="space-between" direction="column">
            <Stack align="start" gap="xs">
              <Text size="sm" fw="bold">
                {file?.originalFileName}
              </Text>
              <Text c="dimmed" size="sm">
                {file?.mimeType} {file?.sizeBytes} bytes
              </Text>
              <Group>
                <Button
                  onClick={() => handleDownload()}
                  variant="light"
                  color="gray"
                  size="xs"
                >
                  Download
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="light"
                  color="gray"
                  size="sm"
                >
                  Delete
                </Button>
              </Group>
            </Stack>
          </Flex>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
