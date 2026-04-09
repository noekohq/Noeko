import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import useFetch from "@core/hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { DownloadSimple, FileTxt } from "@phosphor-icons/react";
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
import { formatFileSize } from "@core/utils/formatting";
import { IIdea } from "@/domains/knowledge";
import { useNavigate } from "react-router";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

export default function TextFileImporter() {
  const { i18n } = useLingui();
  const fileForm = useForm<{
    userFile: File | null;
  }>({
    initialValues: {
      userFile: null,
    },
    validate: {
      userFile: (value) => {
        if (!value) return i18n._(t`File is required`);
        if (value.size > 1024 * 1024 * 10) return i18n._(t`File size should not exceed 10MB`);
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
        setFileContent(await readFileContent(file));
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
        title: i18n._(t`Idea added!`),
        message: i18n._(t`Idea added successfully`),
      });
      fileForm.reset();
      navigate(`/idea/${idea.id.toString()}`);
    },
    onError: async (error) => {
      showNotification({
        title: i18n._(t`Idea Error`),
        message: i18n._(t`Failed to add file`),
        color: "red",
      });
    },
  });

  const handleAddIdea = async () => {
    try {
      const { errors, hasErrors } = fileForm.validate();
      if (hasErrors) {
        showNotification({
          title: i18n._(t`Validation Error`),
          message: errors.userFile,
          color: "red",
        });
      }
      await addIdea();
    } catch (error) {
      showNotification({
        title: i18n._(t`Add Idea Error`),
        message: i18n._(t`Failed to add idea`),
        color: "red",
      });
    }
  };

  const preview = { icon: FileTxt };

  const [openPreview, setOpenPreview] = useState(true);

  return (
    <div>
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Text>
            <Trans>The file is...</Trans>
          </Text>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <FileInput
            placeholder={i18n._(t`Choose a file`)}
            accept="text/*"
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
                <Trans>
                  You want to import <Code>{file.name}</Code>, which is {formatFileSize(file.size)}{" "}
                  in size.
                </Trans>
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
                    <Trans>Hide Preview</Trans>
                  </Button>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <Stack>
                    <Text fw="bold">
                      <Trans>Preview:</Trans>
                    </Text>
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
                  <Trans>Show Preview</Trans>
                </Button>
              </Grid.Col>
            )}
          </>
        )}
        {loadingIdea && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Loader size="sm" />
              <Text>
                <Trans>Importing...</Trans>
              </Text>
            </Group>
          </Grid.Col>
        )}
        {file && (
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              {fileForm.isValid()
                ? i18n._(t`Is that correct?`)
                : i18n._(t`Unfortunately, this file cannot be imported.`)}
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
                <Trans>No, nevermind.</Trans>
              </Button>
              <Button
                onClick={() => {
                  handleAddIdea();
                }}
                disabled={loadingIdea}
                leftSection={loadingIdea ? <Loader size="sm" color="white" /> : undefined}
              >
                <Trans>Yes, import.</Trans>
              </Button>
            </Group>
          </Grid.Col>
        )}
      </Grid>
    </div>
  );
}
