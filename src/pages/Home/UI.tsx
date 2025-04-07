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
} from "@mantine/core";
import styles from "./UI.module.scss";
import { InlineSearch } from "../../components/Search/InlineSearch";
import TextEditor from "../../components/TextEditor/TextEditor";
import { ArrowsClockwise, Plus, X } from "@phosphor-icons/react";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { formatDate } from "../../utils/formatting";

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

  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      generateTitle:
        window.localStorage.getItem("should-autogen-title") === "true",
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
    { content: string },
    IIdea
  >({
    url: "/graph/ideas",
    method: "POST",
    body: {
      ...form.getTransformedValues(),
    },
    dependencies: [form.values],
    onSuccess: () => {
      showNotification({
        title: "Idea added successfully",
        message: "Your idea has been added to the graph.",
      });
    },
    onFinally: () => {
      reloadGraph();
    },
  });

  const handleSubmit = async () => {
    const { hasErrors, errors } = form.validate();
    if (hasErrors) {
      showNotification({
        title: "Errors",
        message: Object.values(errors)[0],
        color: "red",
      });
      return;
    }
    await addIdea();
    form.reset();
    setOpened(false);
  };

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

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Add an idea"
        size="70%"
      >
        <Grid>
          {!form.values.generateTitle && (
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="Title"
                placeholder="Enter title"
                {...form.getInputProps("title")}
              />
            </Grid.Col>
          )}
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
            <TextEditor
              content=""
              onBlur={(content) => {
                form.setFieldValue("content", content);
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="end">
              <Button
                variant="default"
                onClick={() => setOpened(false)}
                disabled={loadingAddIdea}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSubmit();
                }}
                leftSection={
                  loadingAddIdea && <Loader size="sm" color="white" />
                }
                disabled={loadingAddIdea}
              >
                Add
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Modal>
    </div>
  );
}
