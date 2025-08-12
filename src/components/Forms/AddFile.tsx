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
  UploadSimple,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Code,
  FileInput,
  Grid,
  Group,
  Loader,
  Text,
} from "@mantine/core";
import { formatFileSize } from "../../utils/formatting";
import useRabbithole from "../../hooks/useRabbithole";

interface IAddFileFormProps {
  onSubmit?: (file: IUserFile) => void;
  onCancel?: () => void;
}

export default function AddFileForm({ onSubmit, onCancel }: IAddFileFormProps) {
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
      showNotification({
        title: "File Uploaded",
        message: "File uploaded successfully",
      });
      setFormData(undefined);
      fileForm.reset();
      onSubmit?.(file);
      if (isDownRabbithole) {
        includeThing(file.id.toString());
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

  return (
    <Grid>
      <Grid.Col span={{ sm: 12 }}>
        <Text>Start by picking the file you want to upload...</Text>
      </Grid.Col>
      <Grid.Col span={{ sm: 12, md: 6 }}>
        <FileInput
          placeholder="Choose a file"
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
