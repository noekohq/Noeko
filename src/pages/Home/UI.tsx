import { useForm } from "@mantine/form";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import useFetch from "../../hooks/useFetch";
import {
  IDBGraph,
  IIdea,
  SearchResult,
} from "../../../app/database/models/idea";
import { showNotification } from "@mantine/notifications";
import {
  ActionIcon,
  Button,
  Checkbox,
  Flex,
  Grid,
  Group,
  Modal,
  Text,
  TextInput,
  Loader,
  LoadingOverlay,
  Drawer,
  Stack,
  Alert,
  Paper,
} from "@mantine/core";
import styles from "./UI.module.scss";
import { InlineSearch } from "../../components/Search/InlineSearch";
import TextEditor from "../../components/TextEditor/TextEditor";
import { ArrowsClockwise, Plus, X, YoutubeLogo } from "@phosphor-icons/react";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { formatDate } from "../../utils/formatting";
import { isYouTubeLink } from "../../utils/classification";

type UIProps = {
  reloadGraph: () => Promise<void>;
  nodes: INode[];
  flags: IDBGraph["flags"];
};

export default function UI({ reloadGraph, nodes, flags }: UIProps) {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();

  const {
    filter: { set: setFilter, clear: clearFilter },
  } = useGraph();

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const {
    selected: { get: getSelectedNode },
    loading: { get: getLoading, set: setLoading },
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

  useEffect(() => {
    document.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "i"
      ) {
        setOpened(!opened);
      }
    });

    return () => {
      document.removeEventListener("keydown", (event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key === "a"
        ) {
          setOpened(!opened);
        }
      });
    };
  }, []);

  return (
    <div className={`${styles.ui} ${opened ? styles.opened : ""}`}>
      <AddIdea
        opened={opened}
        setOpened={setOpened}
        reloadGraph={reloadGraph}
      />
      <Flex gap={"md"} justify="space-between" align="flex-start">
        <Group>
          {currentNode && (
            <Flex direction="column">
              <Text fw="bold">{currentNode?.title}</Text>
              <Text fw="normal" size="xs" c="dimmed">
                {formatDate(currentNode?.createdAt)}
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
            {!flags.embeddings.synced && (
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
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setOpened(!opened)}
              style={{
                fontSize: 18,
              }}
              title="Add an idea"
            >
              {opened ? <X weight="bold" /> : <Plus weight="bold" />}
            </ActionIcon>
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
            />
          </div>
        </Group>
      </Flex>
    </div>
  );
}

type InputPreview = {
  type: "youtube" | "text";
  value: string;
};

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
        color: "green",
      });
      reloadGraph(); // Reload graph on success
      form.reset();
      setOpened(false);
    },
    onFinally: () => {
      // onFinally can be used for cleanup regardless of success/error
      // If you only want reloadGraph on success, keep it in onSuccess
    },
  });

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

  // --- Clipboard Preview State ---
  const [clipboardPreview, setClipboardPreview] = useState<InputPreview | null>(
    null,
  );
  const [isCheckingClipboard, setIsCheckingClipboard] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  // Function to attempt reading from clipboard
  const handleCheckClipboard = async () => {
    setIsCheckingClipboard(true);
    setClipboardError(null);
    setClipboardPreview(null); // Clear previous preview

    if (!navigator.clipboard?.readText) {
      setClipboardError(
        "Clipboard API is not available or not permitted in this context.",
      );
      setIsCheckingClipboard(false);
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (isYouTubeLink(text)) {
          setClipboardPreview({ type: "youtube", value: text });
        } else {
          setClipboardPreview({ type: "text", value: text });
        }
      } else {
        setClipboardError("Clipboard is empty or contains no text.");
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setClipboardError(
          "Clipboard access denied. You may need to grant permission.",
        );
      } else {
        setClipboardError("Could not read clipboard content.");
      }
    } finally {
      setIsCheckingClipboard(false);
    }
  };

  // Function to use the previewed content
  const handleUsePreview = () => {
    if (clipboardPreview) {
      form.setFieldValue("content", clipboardPreview.value);
      // Optionally clear the preview after using it
      setClipboardPreview(null);
      setClipboardError(null);
    }
  };

  // Optional: Trigger clipboard check when the drawer opens
  // Be mindful of the potential permission prompt this might cause
  useEffect(() => {
    if (opened) {
      // Reset state when opening
      setClipboardPreview(null);
      setClipboardError(null);
      // You could uncomment the line below to *try* checking on open,
      // but the button approach is generally safer/more reliable.
      // handleCheckClipboard();
    }
  }, [opened]);

  // Store generateTitle preference in localStorage
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
      position="bottom"
      size="100vh" // Consider if 100vh is necessary, maybe 'xl' or percentage?
      padding="md" // Added padding
    >
      <Stack gap="lg">
        {" "}
        {/* Use Stack for vertical spacing */}
        <Grid>
          {!form.values.generateTitle && (
            <Grid.Col span={{ base: 12 }}>
              {" "}
              {/* Use base span */}
              <TextInput
                label="Title"
                placeholder="Enter title"
                {...form.getInputProps("title")}
              />
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12 }}>
            <Checkbox
              label="Autogenerate the title"
              description="Automatically generate a title based on the content"
              {...form.getInputProps("generateTitle", {
                type: "checkbox",
              })}
            />
          </Grid.Col>

          {/* --- Clipboard Preview Section --- */}
          <Grid.Col span={{ base: 12 }}>
            <Group>
              <Button
                onClick={handleCheckClipboard}
                loading={isCheckingClipboard}
                variant="light"
                size="xs"
              >
                Check Clipboard for Content
              </Button>
            </Group>
            {clipboardError && (
              <Alert
                title="Clipboard Error"
                color="red"
                mt="sm"
                withCloseButton
                onClose={() => setClipboardError(null)}
              >
                {clipboardError}
              </Alert>
            )}
            {clipboardPreview && (
              <Paper withBorder p="sm" mt="sm">
                <Text size="sm" fw={500} mb={4}>
                  Clipboard Preview:
                </Text>
                {clipboardPreview.type === "youtube" && (
                  <Text size="sm">
                    YouTube Link:{" "}
                    <a
                      href={clipboardPreview.value}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {clipboardPreview.value}
                    </a>
                  </Text>
                  // You could embed a player here if desired
                )}
                {clipboardPreview.type === "text" && (
                  <Text size="sm" lineClamp={3}>
                    {clipboardPreview.value}
                  </Text> // Show truncated text
                )}
                <Button
                  variant="light"
                  size="xs"
                  mt="xs"
                  onClick={handleUsePreview}
                >
                  Use this content
                </Button>
              </Paper>
            )}
          </Grid.Col>
          {/* --- End Clipboard Preview Section --- */}

          <Grid.Col span={{ base: 12 }}>
            <Text mb={4} size="sm" fw={500}>
              Content
            </Text>{" "}
            {/* Added label for TextEditor */}
            <TextEditor
              // Use form value and update on change/blur for better sync
              content={form.values.content}
              onBlur={(content) => {
                form.setFieldValue("content", content);
                form.validateField("content"); // Validate on blur
              }}
            />
            {/* Display content validation error directly */}
            {form.errors.content && (
              <Text c="red" size="xs" mt={4}>
                {form.errors.content}
              </Text>
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12 }}>
            <Group justify="flex-end">
              {" "}
              {/* Changed from "end" */}
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
                  loadingAddIdea ? (
                    <Loader size="sm" color="white" />
                  ) : undefined
                } // Conditional loader
                disabled={loadingAddIdea}
              >
                Add
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Stack>
    </Drawer>
  );
}
