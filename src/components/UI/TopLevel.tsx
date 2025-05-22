import { useForm } from "@mantine/form";
import useShortcuts from "../../hooks/useShortcuts";
import { useNavigate } from "react-router";
import { IIdea } from "../../../app/database/models/ideas";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { validateIdeaContent } from "../../utils/data";
import {
  Checkbox,
  Grid,
  Group,
  Text,
  Loader,
  Button,
  LoadingOverlay,
  Drawer,
  FileInput,
  Code,
} from "@mantine/core";
import DreamWriter from "../Content/DreamWriter/DreamWriter";
import {
  ExclamationMark,
  FileCode,
  FileCsv,
  FilePdf,
  Icon,
  Image,
  UploadSimple,
} from "@phosphor-icons/react";
import { getOS } from "../../utils/platform";
import { handleCreateNewIdea } from "../../utils/ideas";
import { useAuth } from "../../contexts/AuthContext";
import { userIsSuperuser } from "../../utils/user";
import { formatFileSize } from "../../utils/formatting";

export default function TopLevelUI() {
  const navigate = useNavigate();
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";

  const [loadingSomething, setLoadingSomething] = useState(false);

  const { user } = useAuth();
  const isSuperuser = userIsSuperuser(user);

  const [uploadingFile, setUploadingFile] = useState(false);

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl, meta, shift: true, key: "h" },
        run: () => navigate("/"),
      },
      {
        keys: { ctrl, meta, shift: true, key: "g" },
        run: () => navigate("/graph"),
      },
      {
        keys: { ctrl, meta, key: "/" },
        run: () => navigate("/spyglass"),
      },
      {
        keys: { ctrl, meta, key: "," },
        run: () => navigate("/settings"),
      },
      {
        keys: { ctrl, meta, key: "a" },
        run: () => {
          if (isSuperuser) {
            navigate("/admin");
          }
        },
      },
      {
        keys: { ctrl, meta, shift: true, key: "u" },
        run: () => {
          setUploadingFile(true);
        },
      },
      {
        keys: { ctrl, meta, shift: true, key: "i" },
        run: async () => {
          setLoadingSomething(true);
          await handleCreateNewIdea(
            (i) => {
              navigate(`idea/${i.id.toString()}`);
            },
            (err) => {
              showNotification({
                title: "Something went wrong",
                message: "Something went wrong adding the note",
              });
            },
          );
          showNotification({
            title: "Idea created",
            message: "Created a new note",
          });
          setLoadingSomething(false);
        },
      },
    ],
  });

  return (
    <>
      <LoadingOverlay visible={loadingSomething} />
      <UploadFile opened={uploadingFile} setOpened={setUploadingFile} />
    </>
  );
}

type IUploadFileProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
};

function UploadFile({ opened, setOpened }: IUploadFileProps) {
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
    undefined
  >({
    url: "/files/",
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
      setOpened(false);
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
        icon: FilePdf,
      };
    }
    if (type.startsWith("image/")) {
      return {
        icon: Image,
      };
    }
    if (type === "application/json") {
      return {
        icon: FileCode,
      };
    }
    if (type === "text/csv") {
      return {
        icon: FileCsv,
      };
    }
    if (type === "application/xml") {
      return {
        icon: FileCode,
      };
    }
    return;
  };

  const preview = userFile ? typeToPreview(userFile.type) : null;

  return (
    <Drawer
      onClose={() => setOpened(false)}
      opened={opened}
      title="Upload a file"
      offset={14}
      radius="lg"
      position="bottom"
      size="70%"
    >
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
                  <UploadSimple weight="bold" />
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
                color="red"
                variant="light"
                disabled={loadingUpload}
                onClick={() => {
                  fileForm.reset();
                  setOpened(false);
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
    </Drawer>
  );
}
