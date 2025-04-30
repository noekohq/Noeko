import { Link, useNavigate, useParams } from "react-router";
import styles from "./File.module.scss";
import useFetch from "../../hooks/useFetch";
import { IUserFile } from "../../../app/database/models/userfile";
import {
  ActionIcon,
  Button,
  Card,
  Flex,
  Grid,
  Group,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { triggerDownload } from "../../utils/helpers";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import { ArrowLeft } from "@phosphor-icons/react";

export default function UserFile() {
  const { fileId } = useParams();

  const navigate = useNavigate();

  const { data: file } = useFetch<undefined, IUserFile>({
    url: `/files/${fileId}`,
    runOnMount: true,
  });

  const { load: downloadFile, loading: downloadingFile } = useFetch<
    undefined,
    string
  >({
    url: `/files/${fileId}/download`,
    onSuccess: (downloadLink) => {
      console.info("Triggering download");
      triggerDownload(
        downloadLink,
        file?.originalFileName ?? "qwest-file",
        true,
      );
    },
  });

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
      navigate("/files");
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

  return (
    <PageWrapper>
      <LeftSidebar stayCollapsed />
      <div className={styles.file}>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>Viewing file</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="md" withBorder shadow="xs" p="md">
              <Flex justify="space-between">
                <Group align="center">
                  <Text size="lg" fw="bold">
                    {file?.originalFileName}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {file?.mimeType} {file?.sizeBytes} bytes
                  </Text>
                </Group>
                <Group>
                  <Button onClick={() => downloadFile()} variant="light">
                    Download
                  </Button>
                  <Button onClick={handleDelete} variant="light" color="red">
                    Delete
                  </Button>
                </Group>
              </Flex>
            </Card>
          </Grid.Col>
        </Grid>
      </div>
    </PageWrapper>
  );
}
