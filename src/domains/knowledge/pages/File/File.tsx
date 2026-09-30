import { useNavigate, useParams } from "react-router";
import styles from "./File.module.scss";
import useFetch from "@core/hooks/useFetch";
import { IUserFile } from "../../../../../shared/types/userfile";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import ContentWide from "@core/design/components/Layout/ContentWide";
import { handleFileDownload } from "@infrastructure/api/userfiles";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { ViewerMap } from "@domains/knowledge/components/Files/Viewers";
import {
  CaretLeftIcon,
  DownloadSimpleIcon,
  FileIcon,
  FileTextIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { createSourceFrom } from "@domains/knowledge/utils/sources";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { formatFileSize } from "@core/utils/formatting";
import { getFileKindLabel, isSourceableMimeType } from "../../../../../shared/files/mimeTypes";

export default function UserFile() {
  const { i18n } = useLingui();
  const { fileId } = useParams();

  const navigate = useNavigate();

  const { data: file, loading: loadingFile } = useFetch<undefined, IUserFile>({
    url: `/files/${fileId}`,
    runOnMount: true,
  });

  const handleDownload = useCallback(async () => {
    try {
      if (file) {
        handleFileDownload(file);
      } else {
        showNotification({
          title: i18n._(t`No file to download.`),
          message: i18n._(t`Can't download non-existent file.`),
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error fetching file: ", error);
      showNotification({
        title: i18n._(t`Something went wrong`),
        message: i18n._(t`Couldn't download file`),
        color: "red",
      });
    }
  }, [file]);

  const { load: deleteFile, loading: deletingFile } = useFetch<undefined, undefined>({
    url: `/files/${fileId}`,
    method: "DELETE",
    onSuccess: () => {
      console.info("File deleted");
      showNotification({
        title: i18n._(t`File deleted successfully`),
        message: i18n._(t`The file has been deleted successfully.`),
      });
      navigate("/sources");
    },
    onError: (error) => {
      console.error("Error deleting file", error);
      showNotification({
        title: i18n._(t`Error deleting file`),
        message: i18n._(t`An error occurred while deleting the file.`),
        color: "red",
      });
    },
  });

  const handleDelete = () => {
    modals.openConfirmModal({
      title: i18n._(t`Delete file`),
      children: (
        <Text size="sm">
          <Trans>Are you sure you want to delete this file?</Trans>
        </Text>
      ),
      labels: { confirm: i18n._(t`Delete`), cancel: i18n._(t`Cancel`) },
      onConfirm: () => deleteFile(),
      confirmProps: {
        color: "red",
      },
    });
  };

  const [loadingSource, setLoadingSource] = useState(false);
  const handleCreateSource = async () => {
    try {
      if (!file) {
        console.error("Tried to create source from nonexistent file");
        return undefined;
      }
      setLoadingSource(true);
      const source = await createSourceFrom(file.id.toString());
      if (!source) {
        throw new Error("Failed to create source");
      }
      navigate(`/source/${source.id.toString()}`);
    } catch (error) {
      console.error("Error creating source from file", error);
      showNotification({
        title: "Couldn't create source",
        message: "The file could not be converted into a source.",
        color: "red",
      });
    } finally {
      setLoadingSource(false);
    }
  };

  const Viewer = useMemo(() => {
    if (file?.mimeType && file.mimeType in ViewerMap) {
      return lazy(ViewerMap[file.mimeType]);
    }
    return null;
  }, [file]);

  const canBeSource = !!file && isSourceableMimeType(file.mimeType);
  const fileKind = file ? getFileKindLabel(file.mimeType) : "File";

  const sourceStatus = file?.source
    ? "Source ready"
    : canBeSource
      ? "Can become a source"
      : "Preview only";

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar>
        <LeftSidebar.Open>
          <Stack gap="lg">
            <Stack gap={6}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                File context
              </Text>
              {loadingFile ? (
                <Skeleton height={76} radius="lg" />
              ) : (
                <Paper className={styles.detailsCard} p="md" radius="lg" withBorder>
                  <Stack gap={8}>
                    <Badge variant="light" color="gray" radius="xl" w="fit-content">
                      {fileKind}
                    </Badge>
                    <Text size="sm" fw={600} className={styles.contextFileName}>
                      {file?.originalFileName || "File not found"}
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Stack>

            {file && (
              <Stack gap="md">
                <ContextField label="Format" value={file.mimeType} />
                <ContextField label="Size" value={formatFileSize(file.sizeBytes)} />
                <ContextField label="Source status" value={sourceStatus} />
                <ContextField label="Added" value={formatDate(file.createdAt)} />
                {file.updatedAt &&
                  new Date(file.updatedAt).getTime() !== new Date(file.createdAt).getTime() && (
                    <ContextField label="Updated" value={formatDate(file.updatedAt)} />
                  )}
              </Stack>
            )}
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <ContentWide>
        <div className={styles.fileView}>
          <header className={styles.fileHeader}>
            <Group gap="xs">
              <Tooltip label="Go back">
                <ActionIcon
                  onClick={() => navigate(-1)}
                  color="gray"
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  aria-label="Go back"
                >
                  <CaretLeftIcon weight="bold" />
                </ActionIcon>
              </Tooltip>
              <Text size="sm" c="dimmed">
                Files
              </Text>
            </Group>

            <div className={styles.titleBlock}>
              {loadingFile ? (
                <Skeleton height={38} width="65%" radius="md" />
              ) : (
                <Title order={2}>{file?.originalFileName || "File not found"}</Title>
              )}
            </div>
          </header>

          {loadingFile && <Skeleton className={styles.viewerSurface} radius="xl" />}
          {file && (
            <Paper className={styles.viewerSurface} radius="xl" withBorder>
              <Suspense
                fallback={
                  <div className={styles.viewerLoading}>
                    <Text size="sm" c="dimmed">
                      Loading viewer…
                    </Text>
                  </div>
                }
              >
                {Viewer ? (
                  <Viewer fileId={file.id} file={file} />
                ) : (
                  <div className={styles.unsupportedViewer}>
                    <FileIcon size={38} weight="duotone" />
                    <Stack gap={4} align="center">
                      <Text fw={600}>Preview unavailable</Text>
                      <Text c="dimmed" size="sm" ta="center">
                        Download this file to open it in a compatible app.
                      </Text>
                    </Stack>
                  </div>
                )}
              </Suspense>
            </Paper>
          )}
        </div>
      </ContentWide>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <Stack gap="lg">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Actions
            </Text>
            {file?.source ? (
              <Button
                onClick={() => navigate(`/source/${file.source?.id.toString()}`)}
                variant="light"
                color="gray"
                leftSection={<FileTextIcon />}
                fullWidth
              >
                View source
              </Button>
            ) : (
              canBeSource && (
                <Button
                  onClick={handleCreateSource}
                  variant="filled"
                  leftSection={<FileTextIcon />}
                  fullWidth
                  loading={loadingSource}
                >
                  Convert to source
                </Button>
              )
            )}
            <Button
              onClick={handleDownload}
              variant="light"
              color="gray"
              leftSection={<DownloadSimpleIcon />}
              fullWidth
              disabled={!file}
            >
              Download
            </Button>
            <Button
              onClick={handleDelete}
              variant="subtle"
              color="red"
              leftSection={<TrashSimpleIcon />}
              fullWidth
              loading={deletingFile}
              disabled={!file}
            >
              Delete file
            </Button>
          </Stack>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" className={styles.contextValue}>
        {value}
      </Text>
    </Stack>
  );
}
