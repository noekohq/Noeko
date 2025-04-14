import { useParams } from "react-router";
import styles from "./File.module.scss";
import useFetch from "../../hooks/useFetch";
import { IUserFile } from "../../../app/database/models/userfile";
import { Button, Card, Flex, Grid, Group, Text, Title } from "@mantine/core";
import { triggerDownload } from "../../utils/helpers";

export default function UserFile() {
  const { fileId } = useParams();

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

  console.log(file);

  return (
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
              </Group>
            </Flex>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}
