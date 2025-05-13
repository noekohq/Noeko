import React, { useEffect, useState } from "react";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import styles from "./Import.module.scss";
import {
  Button,
  Card,
  Code,
  FileInput,
  Grid,
  Group,
  SegmentedControl,
  Select,
  Text,
  Title,
  Loader,
  Stack,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { DownloadSimple, MarkdownLogo } from "@phosphor-icons/react";
import { formatFileSize, markdownToHtml } from "../../utils/formatting";
import { readFileContent } from "../../utils/files";

type IImportType = "markdown-file" | "text-file" | "directory";

export default function Import() {
  const [importType, setImportType] = useState<IImportType>("markdown-file");

  const typeToComponent: Record<IImportType, React.ReactNode | null> = {
    "markdown-file": <ImportMarkdownFile />,
    "text-file": null,
    directory: null,
  };

  return (
    <PageWrapper>
      <LeftSidebar />
      <div className={styles.import}>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>Import</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              I would like to import{" "}
              <Select
                display="inline-block"
                ml="xs"
                size="sm"
                value={importType}
                data={[
                  {
                    label: "a markdown file",
                    value: "markdown-file" satisfies IImportType,
                  },
                  {
                    label: "a text file",
                    value: "text-file" satisfies IImportType,
                  },
                  {
                    label: "a folder",
                    value: "directory" satisfies IImportType,
                  },
                ]}
                onChange={(v) => {
                  setImportType(v as IImportType);
                }}
              />
            </Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>{typeToComponent[importType]}</Grid.Col>
        </Grid>
      </div>
      <RightSidebar />
    </PageWrapper>
  );
}

function ImportMarkdownFile() {
  const fileForm = useForm<{
    userFile: File | null;
  }>({
    initialValues: {
      userFile: null,
    },
    validate: {
      userFile: (value) => {
        if (!value) return "File is required";
        if (value.size > 1024 * 1024 * 10)
          return "File size should not exceed 10MB";
        return null;
      },
    },
  });

  const file = fileForm.values.userFile;

  const [formData, setFormData] = useState<FormData>();
  const { load: uploadFile, loading: loadingUpload } = useFetch<
    FormData,
    undefined
  >({
    url: "/import/markdown",
    method: "POST",
    body: formData,
    dependencies: [formData],
    onSuccess: async () => {
      showNotification({
        title: "File Uploaded",
        message: "File uploaded successfully",
      });
      setFormData(undefined);
      fileForm.reset();
    },
    onError: async (error) => {
      showNotification({
        title: "Upload Error",
        message: "Failed to upload file",
        color: "red",
      });
    },
  });

  const handleUploadFile = async () => {
    try {
      const { errors, hasErrors } = fileForm.validate();
      if (hasErrors) {
        showNotification({
          title: "Validation Error",
          message: errors.userFile,
          color: "red",
        });
      }
      await uploadFile();
    } catch (error) {
      showNotification({
        title: "Upload Error",
        message: "Failed to upload file",
        color: "red",
      });
    }
  };

  useEffect(() => {
    if (!file) {
      return;
    }
    const { errors, hasErrors } = fileForm.validate();
    if (!hasErrors) {
      const formData = new FormData();
      formData.append("file", file);
      setFormData(formData);
    }
    if (hasErrors) {
      showNotification({
        title: "Validation Error",
        message: errors.userFile,
        color: "red",
      });
    }
  }, [file]);

  const preview = { icon: MarkdownLogo };

  const [fileContent, setFileContent] = useState("Nothing to see here.");
  useEffect(() => {
    if (file) {
      (async () => {
        setFileContent(await readFileContent(file));
      })();
    }
  }, [file]);

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
              <>
                {preview ? (
                  <preview.icon weight="bold" />
                ) : (
                  <DownloadSimple weight="bold" />
                )}
              </>
            }
          />
        </Grid.Col>
        {file && (
          <>
            <Grid.Col span={{ sm: 12 }}>
              <Text>
                You want to import <Code>{file.name}</Code>, which is{" "}
                {formatFileSize(file.size)} in size.{" "}
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
                        <Title fw="bold">{file.name.split(".")[0]}</Title>
                        <Divider my="md" />
                        <Text
                          dangerouslySetInnerHTML={{
                            __html: markdownToHtml(fileContent),
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
        {loadingUpload && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Loader size="sm" />
              <Text>Importing markdown...</Text>
            </Group>
          </Grid.Col>
        )}
        {file && (
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              {fileForm.isValid()
                ? "Is that correct?"
                : "Unfortunately, this file cannot be uploaded."}
            </Text>
          </Grid.Col>
        )}
        {file && fileForm.isValid() && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Button
                color="red"
                variant="light"
                disabled={loadingUpload}
                onClick={() => {
                  fileForm.reset();
                }}
              >
                No, nevermind.
              </Button>
              <Button
                onClick={() => {
                  handleUploadFile();
                }}
                disabled={loadingUpload}
                leftSection={
                  loadingUpload ? <Loader size="sm" color="white" /> : undefined
                }
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
