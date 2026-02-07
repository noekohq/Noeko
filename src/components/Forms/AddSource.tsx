import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { IUserFile } from "../../../app/database/models/userfile";
import useFetch from "../../hooks/useFetch";
import {
  FileCodeIcon,
  FileCsvIcon,
  FilePdfIcon,
  Icon,
  ImageIcon,
  MegaphoneIcon,
  UploadSimple,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import {
  ActionIcon,
  Badge,
  Button,
  Code,
  FileInput,
  Grid,
  Group,
  HoverCard,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { formatFileSize } from "../../utils/formatting";
import useRabbithole from "../../hooks/useRabbithole";
import { ISource } from "../../../app/database/models/source";
import { createSourceFrom } from "../../utils/sources";
import { useNavigate } from "react-router";
import { useInteraction } from "../../contexts/InteractionContext";

interface IAddSourceFormProps {
  onSubmit?: (source: ISource) => void;
  onCancel?: () => void;
}

export default function AddSourceForm({
  onSubmit,
  onCancel,
}: IAddSourceFormProps) {
  const { includeThing, isDownRabbithole } = useRabbithole();

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

  const userFile = fileForm.values.userFile;

  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>();
  const { load: uploadFile, loading: loadingUpload } = useFetch<
    FormData,
    IUserFile
  >({
    url: "/files/",
    method: "POST",
    body: formData,
    dependencies: [formData],
    onSuccess: async (file) => {
      setFormData(undefined);
      fileForm.reset();
      const source = await createSourceFrom(file.id.toString());
      if (!source) {
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong adding your source",
          color: "red",
        });
        return;
      }
      if (isDownRabbithole) {
        includeThing(source.id.toString());
      }
      onSubmit?.(source);
      showNotification({
        title: "Success!",
        message: "Source added successfully",
      });
      if (!onSubmit) {
        navigate(`/source/${source.id.toString()}`);
      }
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
    if (!userFile) {
      return;
    }
    const { errors, hasErrors } = fileForm.validate();
    if (!hasErrors) {
      const formData = new FormData();
      formData.append("userFile", userFile);
      setFormData(formData);
    }
    if (hasErrors) {
      showNotification({
        title: "Validation Error",
        message: errors.userFile,
        color: "red",
      });
    }
  }, [userFile]);

  const typeToPreview: (type: string) =>
    | {
        icon: Icon;
      }
    | undefined = (type) => {
    if (type === "application/pdf") {
      return {
        icon: FilePdfIcon,
      };
    }
    if (type.startsWith("image/")) {
      return {
        icon: ImageIcon,
      };
    }
    if (type === "application/json") {
      return {
        icon: FileCodeIcon,
      };
    }
    if (type === "text/csv") {
      return {
        icon: FileCsvIcon,
      };
    }
    if (type === "application/xml") {
      return {
        icon: FileCodeIcon,
      };
    }
    return;
  };

  const preview = userFile ? typeToPreview(userFile.type) : null;
  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <Grid>
      <Grid.Col>
        <HoverCard openDelay={400} width="300px">
          <HoverCard.Target>
            <Badge color="orange" size="sm" variant="light">
              EXPERIMENTAL
            </Badge>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap="xs">
              <Text size="sm">
                Sources is currently under active development and some features
                might not work as expected. We're looking for feedback as we
                learn and grow :)
              </Text>
              <Text size="xs" c="dimmed">
                This feature will remain free during its experimental phases,
                rate limits may apply in future iterations.
              </Text>
              <ActionIcon
                size="sm"
                variant="light"
                color="gray"
                onClick={() => {
                  openFeedbackModal();
                }}
              >
                <MegaphoneIcon />
              </ActionIcon>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      </Grid.Col>
      <Grid.Col span={{ sm: 12 }}>
        <Text>Start by picking the file you want to upload...</Text>
      </Grid.Col>
      <Grid.Col span={{ sm: 12, md: 6 }}>
        <FileInput
          placeholder="Choose a file"
          accept="application/pdf"
          {...fileForm.getInputProps("userFile")}
          leftSection={
            <>
              {preview ? (
                <preview.icon weight="bold" />
              ) : (
                <UploadSimpleIcon weight="bold" />
              )}
            </>
          }
        />
      </Grid.Col>
      {userFile && (
        <Grid.Col span={{ sm: 12 }}>
          <Text>
            You want to upload <Code>{userFile.name}</Code>, which is{" "}
            {formatFileSize(userFile.size)} in size.{" "}
            {fileForm.isValid()
              ? "Is that correct?"
              : "Unfortunately, this file cannot be uploaded."}
          </Text>
        </Grid.Col>
      )}
      {loadingUpload && (
        <Grid.Col span={{ sm: 12 }}>
          <Group>
            <Loader size="sm" />
            <Text>Uploading file...</Text>
          </Group>
        </Grid.Col>
      )}
      {userFile && fileForm.isValid() && (
        <Grid.Col span={{ sm: 12 }}>
          <Group>
            <Button
              color="gray"
              variant="light"
              disabled={loadingUpload}
              onClick={() => {
                fileForm.reset();
                onCancel?.();
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
              Yes, upload.
            </Button>
          </Group>
        </Grid.Col>
      )}
    </Grid>
  );
}
