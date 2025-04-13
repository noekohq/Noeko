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
  Stack,
  Title,
} from "@mantine/core";
import styles from "./UI.module.scss";
import { InlineSearch } from "../../components/Search/InlineSearch";
import TextEditor from "../../components/TextEditor/TextEditor";
import { ArrowsClockwise, Plus, X, YoutubeLogo } from "@phosphor-icons/react";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { formatDate } from "../../utils/formatting";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import useShortcuts from "../../hooks/useShortcuts";

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

  useShortcuts({
    shortcuts: [
      {
        keys: { meta: true, key: "i" },
        run: () => {
          setOpened(!opened);
        },
      },
    ],
  });

  const enableDeveloperTools = false;

  const { load: refreshUser } = useFetch({
    url: "/users/refresh",
    method: "POST",
  });

  useEffect(() => {}, []);

  return (
    <div className={`${styles.ui} ${opened ? styles.opened : ""}`}>
      <AddIdea
        opened={opened}
        setOpened={setOpened}
        reloadGraph={reloadGraph}
      />
      <Flex gap={"md"} justify="space-between" align="flex-start">
        {enableDeveloperTools && (
          <Group>
            <Button
              leftSection={<ArrowsClockwise weight="bold" />}
              onClick={() => {
                refreshUser();
              }}
              variant="light"
            >
              Refresh Auth
            </Button>
          </Group>
        )}
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
      <Stack gap="lg">
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
