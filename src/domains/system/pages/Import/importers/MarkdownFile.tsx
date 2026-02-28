import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import useFetch from "@core/hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { DownloadSimple, FileMd } from "@phosphor-icons/react";
import { formatFileNameToTitle, readFileContent } from "@infrastructure/api/files";
import {
  Button,
  Card,
  Code,
  Divider,
  FileInput,
  Grid,
  Text,
  Title,
  Stack,
  Loader,
  Group,
} from "@mantine/core";
import { formatFileSize, markdownToHtml } from "@core/utils/formatting";
import { IIdea, IIdeaForm } from "@/domains/knowledge";
import { useNavigate } from "react-router";

export default function MarkdownFileImporter() {
  const fileForm = useForm<{
    userFile: File | null;
  }>({
    initialValues: {
      userFile: null,
    },
    validate: {
      userFile: (value) => {
        if (!value) return "File is required";
        if (value.size > 1024 * 1024 * 10) return "File size should not exceed 10MB";
        return null;
      },
    },
  });

  const navigate = useNavigate();

  const file = fileForm.values.userFile;
  const [fileTitle, setFileTitle] = useState("");
  const [fileContent, setFileContent] = useState("");
  useEffect(() => {
    if (file) {
      (async () => {
        setFileTitle(formatFileNameToTitle(file.name));
        setFileContent(markdownToHtml(await readFileContent(file)));
      })();
    }
  }, [file]);

  const { load: addIdea, loading: loadingIdea } = useFetch<
    { title?: string; content: string; generateTitle: boolean },
    IIdea
  >({
    url: "/ideas",
    method: "POST",
    body: {
      title: fileTitle,
      content: fileContent,
      generateTitle: !fileTitle,
    },
    dependencies: [fileTitle, fileContent],
    onSuccess: async (idea) => {
      showNotification({
        title: "Idea added!",
        message: "Idea added successfully",
      });
      fileForm.reset();
      navigate(`/idea/${idea.id.toString()}`);
    },
    onError: async (error) => {
      showNotification({
        title: "Idea Error",
        message: "Failed to add file",
        color: "red",
      });
    },
  });

  const handleAddIdea = async () => {
    try {
      const { errors, hasErrors } = fileForm.validate();
      if (hasErrors) {
        showNotification({
          title: "Validation Error",
          message: errors.userFile,
          color: "red",
        });
      }
      await addIdea();
    } catch (error) {
      showNotification({
        title: "Add Idea Error",
        message: "Failed to add idea",
        color: "red",
      });
    }
  };

  const preview = { icon: FileMd };

  const [openPreview, setOpenPreview] = useState(true);

  return (
    <div>
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Text>The file is...</Text>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <FileInput
            placeholder="Choose a file"
            accept="text/markdown"
            {...fileForm.getInputProps("userFile")}
            leftSection={
              <>{preview ? <preview.icon weight="bold" /> : <DownloadSimple weight="bold" />}</>
            }
          />
        </Grid.Col>
        {file && (
          <>
            <Grid.Col span={{ sm: 12 }}>
              <Text>
                You want to import <Code>{file.name}</Code>, which is {formatFileSize(file.size)} in
                size.{" "}
              </Text>
            </Grid.Col>
            {openPreview ? (
              <>
                <Grid.Col span={{ sm: 12 }}>
                  <Button
                    variant="default"
                    onClick={() => {
                      setOpenPreview(false);
                    }}
                  >
                    Hide Preview
                  </Button>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <Stack>
                    <Text fw="bold">Preview:</Text>
                    <Card radius="lg" withBorder>
                      <Stack gap="sm">
                        <Title fw="bold">{formatFileNameToTitle(file.name)}</Title>
                        <Divider my="md" />
                        <Text
                          dangerouslySetInnerHTML={{
                            __html: fileContent,
                          }}
                        />
                      </Stack>
                    </Card>
                  </Stack>
                </Grid.Col>
              </>
            ) : (
              <Grid.Col span={{ sm: 12 }}>
                <Button
                  variant="light"
                  onClick={() => {
                    setOpenPreview(true);
                  }}
                >
                  Show Preview
                </Button>
              </Grid.Col>
            )}
          </>
        )}
        {loadingIdea && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Loader size="sm" />
              <Text>Importing...</Text>
            </Group>
          </Grid.Col>
        )}
        {file && (
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              {fileForm.isValid()
                ? "Is that correct?"
                : "Unfortunately, this file cannot be imported."}
            </Text>
          </Grid.Col>
        )}
        {file && fileForm.isValid() && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Button
                color="red"
                variant="light"
                disabled={loadingIdea}
                onClick={() => {
                  fileForm.reset();
                }}
              >
                No, nevermind.
              </Button>
              <Button
                onClick={() => {
                  handleAddIdea();
                }}
                disabled={loadingIdea}
                leftSection={loadingIdea ? <Loader size="sm" color="white" /> : undefined}
              >
                Yes, import.
              </Button>
            </Group>
          </Grid.Col>
        )}
      </Grid>
    </div>
  );
}
