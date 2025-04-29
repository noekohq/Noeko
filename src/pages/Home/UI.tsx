import { useForm } from "@mantine/form";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import useFetch from "../../hooks/useFetch";
import {
  IDBGraph,
  IIdea,
  SearchResult,
} from "../../../app/database/models/ideas";
import { showNotification } from "@mantine/notifications";
import {
  ActionIcon,
  Button,
  Checkbox,
  Flex,
  Grid,
  Group,
  Text,
  TextInput,
  Loader,
  Drawer,
  Title,
  FileInput,
  Code,
  Tooltip,
} from "@mantine/core";
import styles from "./UI.module.scss";
import { InlineSearch } from "../../components/Search/InlineSearch";
import {
  ArrowsClockwise,
  ExclamationMark,
  FileCode,
  FileCsv,
  FilePdf,
  Icon,
  Image,
  Plus,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { formatDate, formatFileSize } from "../../utils/formatting";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import useShortcuts from "../../hooks/useShortcuts";
import { validateIdeaContent } from "../../utils/data";
import { useAuth } from "../../contexts/AuthContext";
import { userIsSuperuser } from "../../utils/user";

type UIProps = {
  reloadGraph: () => Promise<void>;
  nodes: INode[];
  flags: IDBGraph["flags"];
};

export default function UI({ reloadGraph, nodes, flags }: UIProps) {
  const [addIdeaOpened, setAddIdeaOpened] = useState(false);
  const [uploadFileOpened, setUploadFileOpened] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth();
  const isAdmin = userIsSuperuser(user);

  const {
    filter: { set: setFilter, clear: clearFilter },
  } = useGraph();

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const {
    selected: { get: getSelectedNode },
    loading: { get: getLoading, set: setLoading },
    query: { set: setQuery },
  } = useGraph();

  const selectedNode = getSelectedNode();

  const currentNode = selectedNode ? nodeMap.get(selectedNode) : null;

  const handleResults = useCallback((results: SearchResult[]) => {
    const ideas = results.map((r) => r.idea.id);
    setFilter({
      filter: (idea) => ideas.includes(idea.id),
    });
    return ideas;
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    const normalized = q.toLowerCase();
    setFilter({
      filter: (node) => {
        if (node.type === "idea") {
          return node.title.toLowerCase().includes(normalized);
        }
        if (node.type === "file") {
          return node.originalFileName.toLowerCase().includes(normalized);
        }
        return false;
      },
    });
  }, []);

  const handleResultsClear = useCallback(() => {
    clearFilter();
  }, []);

  const { load: synchronizeGraph, loading: loadingSynchronizeGraph } = useFetch<
    undefined,
    undefined
  >({
    url: "/graph/synchronize",
    method: "POST",
    onFinally: () => {
      reloadGraph();
    },
  });

  const statusText = () => {
    let text = "";
    if (!flags.embeddings.synced) {
      text += "Embeddings out of sync. ";
    }
    return text;
  };

  useShortcuts({
    shortcuts: [
      {
        keys: { meta: true, key: "i" },
        run: () => {
          setAddIdeaOpened(!addIdeaOpened);
        },
      },
      {
        keys: { meta: true, key: "u" },
        run: () => {
          setUploadFileOpened(!uploadFileOpened);
        },
      },
    ],
  });

  const enableDeveloperTools = false;
  const enableAdminTools = isAdmin;

  const { load: refreshUser } = useFetch({
    url: "/users/refresh",
    method: "POST",
  });

  const getNodeTitle = (node: INode) => {
    if (node.type === "idea") {
      return node.title;
    }
    if (node.type === "file") {
      return node.originalFileName;
    }
  };

  const getNodeSubtitle = (node: INode) => {
    if (node.type === "idea") {
      return formatDate(node.createdAt);
    }
    if (node.type === "file") {
      return formatDate(node.createdAt);
    }
    if (node.type === "derived") {
      return node.type;
    }
  };

  return (
    <div className={`${styles.ui}`}>
      <AddIdea
        opened={addIdeaOpened}
        setOpened={setAddIdeaOpened}
        reloadGraph={reloadGraph}
      />
      <UploadFile
        opened={uploadFileOpened}
        setOpened={setUploadFileOpened}
        reloadGraph={reloadGraph}
      />
      <Flex gap={"md"} justify="space-between" align="flex-start">
        <Group>
          {currentNode && (
            <Flex direction="column">
              <Text fw="bold">{getNodeTitle(currentNode)}</Text>
              <Text fw="normal" size="xs" c="dimmed">
                {getNodeSubtitle(currentNode)}
              </Text>
            </Flex>
          )}
        </Group>
        <Group>
          <Group justify="end">
            <Text c="dimmed" size="sm">
              {statusText()}
            </Text>
          </Group>
          <Group justify="end">
            {enableAdminTools && (
              <ActionIcon
                variant="default"
                size="lg"
                style={{
                  fontSize: 18,
                }}
                onClick={() => synchronizeGraph()}
                title="Synchronize graph embeddings"
              >
                {loadingSynchronizeGraph ? (
                  <Loader size="xs" />
                ) : (
                  <ArrowsClockwise weight="bold" />
                )}
              </ActionIcon>
            )}
            <Tooltip label="Upload file">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setUploadFileOpened(!uploadFileOpened)}
                style={{
                  fontSize: 18,
                }}
                title="Add an idea"
              >
                {uploadFileOpened ? (
                  <X weight="bold" />
                ) : (
                  <UploadSimple weight="bold" />
                )}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Add an idea">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setAddIdeaOpened(!addIdeaOpened)}
                style={{
                  fontSize: 18,
                }}
                title="Add an idea"
              >
                {addIdeaOpened ? <X weight="bold" /> : <Plus weight="bold" />}
              </ActionIcon>
            </Tooltip>
          </Group>
          <div className={styles.searchWrapper}>
            <InlineSearch
              onSelect={(i) => {
                navigate(`/idea/${i.id}`);
              }}
              onResults={handleResults}
              onResultsClear={handleResultsClear}
              onBlur={() => {
                handleResultsClear();
              }}
              onSearchStart={() => {
                setLoading(true);
              }}
              onSearchEnd={() => {
                setLoading(false);
              }}
              onShortcuts={[{ key: "/" }, { meta: true, key: "k" }]}
              onQueryChange={handleQueryChange}
              helpText="Press enter to search deeper..."
            />
          </div>
        </Group>
      </Flex>
    </div>
  );
}

type AddIdeaProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  reloadGraph: () => void;
};

function AddIdea({ opened, setOpened, reloadGraph }: AddIdeaProps) {
  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      generateTitle:
        typeof window !== "undefined" // Check if window exists (for SSR/build)
          ? window.localStorage.getItem("should-autogen-title") === "true"
          : false,
    },
    validate: {
      title: (value, fields) => {
        if (fields.generateTitle) {
          return null;
        }
        if (value.length < 2 && !fields.generateTitle) {
          return "Title must be at least 2 characters long";
        }
        return null;
      },
      content: (value) =>
        value.length < 2 ? "Content must be at least 2 characters long" : null,
    },
  });

  const { load: addIdea, loading: loadingAddIdea } = useFetch<
    { title?: string; content: string; generateTitle: boolean }, // Adjusted body type
    IIdea
  >({
    url: "/graph/ideas",
    method: "POST",
    // Send title only if not generating
    body: {
      ...(form.values.generateTitle ? {} : { title: form.values.title }),
      content: form.values.content,
      generateTitle: form.values.generateTitle,
    },
    dependencies: [form.values], // Dependency array ensures fetch updates when form values change
    onSuccess: (data) => {
      // Added data parameter
      showNotification({
        title: "Idea added successfully",
        message: `Your idea "${data.title || "Generated Title"}" has been added.`,
      });
      reloadGraph(); // Reload graph on success
      form.reset();
      setOpened(false);
    },
    onError: (error) => {
      console.error("Failed to add idea:", error);
      showNotification({
        title: "Error Adding Idea",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
      });
    },
    onFinally: () => {
      // onFinally can be used for cleanup regardless of success/error
      // If you only want reloadGraph on success, keep it in onSuccess
    },
  });

  const [contentError, setContentError] = useState<string>();
  useEffect(() => {
    const { isValid, errors: contentErrors } = validateIdeaContent(
      form.values.content,
    );
    if (!isValid) {
      setContentError(contentErrors[0]);
      showNotification({
        title: "Content Error",
        message: contentErrors[0],
        color: "red",
      });
      return;
    } else if (isValid) {
      setContentError(undefined);
    }
  }, [form.values.content]);

  const handleSubmit = async () => {
    const { hasErrors, errors } = form.validate();
    if (hasErrors) {
      showNotification({
        title: "Validation Error",
        message: Object.values(errors)[0] || "Please check the form fields.",
        color: "red",
      });
      return;
    }
    const { isValid, errors: contentErrors } = validateIdeaContent(
      form.values.content,
    );
    if (!isValid) {
      setContentError(contentErrors[0]);
      showNotification({
        title: "Content Error",
        message: contentError,
        color: "red",
      });
      return;
    } else if (isValid) {
      setContentError(undefined);
    }
    try {
      await addIdea();
      // Resetting and closing are now handled in onSuccess
    } catch (error) {
      console.error("Failed to add idea:", error);
      showNotification({
        title: "Error Adding Idea",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
      });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "should-autogen-title",
        String(form.values.generateTitle),
      );
    }
  }, [form.values.generateTitle]);

  return (
    <Drawer
      opened={opened}
      onClose={() => setOpened(false)}
      title="Add an idea"
      offset={14}
      radius="lg"
      position="bottom"
      size="70%"
    >
      <Grid gutter="xl">
        <Grid.Col span={{ sm: 12 }}>
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              {!form.values.generateTitle && (
                <TextInput
                  label="Title"
                  placeholder="Enter title"
                  {...form.getInputProps("title")}
                />
              )}
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Checkbox
                label="Autogenerate the title"
                description="Automatically generate a title based on the content"
                {...form.getInputProps("generateTitle", {
                  type: "checkbox",
                })}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                {/* <Button
                      onClick={handleCheckClipboard}
                      loading={isCheckingClipboard}
                      variant="light"
                      size="xs"
                    >
                      Check Clipboard for Content
                    </Button> */}
              </Group>
            </Grid.Col>
          </Grid>
        </Grid.Col>

        <Grid.Col span={{ sm: 12 }}>
          <Title order={3}>Content</Title>
          <DreamWriter
            initialContent={""}
            stickyMenu={true}
            onChange={(content) => {
              form.setFieldValue("content", content);
            }}
          />
          {form.errors.content && (
            <Text c="red" size="xs" mt={4}>
              {form.errors.content}
            </Text>
          )}
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }} />
        {loadingAddIdea && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Loader size="sm" />
              <Text>Creating idea... This may take a short while.</Text>
            </Group>
          </Grid.Col>
        )}
        {contentError && (
          <Grid.Col span={{ sm: 12 }}>
            <Group c="red">
              <ExclamationMark />
              <Text>{contentError}</Text>
            </Group>
          </Grid.Col>
        )}
        <Grid.Col span={{ sm: 12 }}>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setOpened(false)}
              disabled={loadingAddIdea}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit} // Simplified onClick
              leftSection={
                loadingAddIdea ? <Loader size="sm" color="white" /> : undefined
              }
              disabled={loadingAddIdea || !!contentError}
            >
              Add
            </Button>
          </Group>
        </Grid.Col>
      </Grid>
    </Drawer>
  );
}

type IUploadFileProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  reloadGraph: () => void;
};

function UploadFile({ opened, setOpened, reloadGraph }: IUploadFileProps) {
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
    url: "/files/user_file",
    method: "POST",
    body: formData,
    dependencies: [formData],
    onSuccess: async () => {
      reloadGraph();
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
