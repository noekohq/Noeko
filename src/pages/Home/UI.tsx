import { useForm } from "@mantine/form";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import useFetch from "../../hooks/useFetch";
import { IIdea, SearchResult } from "../../../app/database/models/idea";
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
} from "@mantine/core";
import styles from "./UI.module.scss";
import { InlineSearch } from "../../components/Search/InlineSearch";
import TextEditor from "../../components/TextEditor/TextEditor";
import { Plus, X } from "@phosphor-icons/react";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { formatDate } from "../../utils/formatting";

type UIProps = {
  reloadGraph: () => Promise<void>;
  nodes: INode[];
};

export default function UI({ reloadGraph, nodes }: UIProps) {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();

  const {
    filter: { set: setFilter, clear: clearFilter },
  } = useGraph();

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const {
    selected: { get: getSelectedNode },
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

  const { load: addIdea } = useFetch<{ content: string }, IIdea>({
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

  return (
    <div className={`${styles.ui} ${opened ? styles.opened : ""}`}>
      <Flex gap={"md"} justify="space-between">
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
          <div className={styles.searchWrapper}>
            <InlineSearch
              onSelect={(i) => {
                navigate(`/idea/${i.id}`);
              }}
              onResults={handleResults}
              onResultsClear={handleResultsClear}
            />
          </div>
          <Group justify="end">
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
              <Button variant="default" onClick={() => setOpened(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSubmit();
                }}
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
