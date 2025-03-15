import Graph from "../../components/Graph/Graph";
import { IGraph } from "../../declarations/graph";
import { useRef, useState } from "react";
import styles from "./Home.module.scss";
import {
  ActionIcon,
  Button,
  Checkbox,
  Grid,
  Group,
  Modal,
  TextInput,
} from "@mantine/core";
import { Plus, X } from "@phosphor-icons/react";
import { useForm } from "@mantine/form";
import TextEditor from "../../components/TextEditor/TextEditor";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { IDBGraph, IIdea, IIdeaForm } from "../../../app/database/models/idea";
import { useNavigate } from "react-router";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: graphData, load: reloadGraph } = useFetch<undefined, IDBGraph>({
    url: "/graph",
    runOnMount: true,
  });

  const localData: IGraph = {
    nodes: graphData
      ? graphData?.ideas.map((n) => {
          return {
            ...n,
            id: n.id,
            title: n.title,
            content: n.content,
          };
        })
      : [],
    edges: graphData
      ? graphData.edges.map((e) => {
          return {
            ...e,
            id: e.id,
            source: e.in,
            target: e.out,
          };
        })
      : [],
  };

  console.log("Graph", graphData, localData);

  const navigate = useNavigate();

  return (
    <div ref={containerRef} className={styles.container}>
      <Graph
        graph={localData}
        onNodeClick={(e, n) => {
          navigate(`/idea/${n.id}`);
        }}
      />
      <AddNode reloadGraph={reloadGraph} />
    </div>
  );
}

type UIProps = {
  reloadGraph: () => void;
};

function AddNode({ reloadGraph }: UIProps) {
  const [opened, setOpened] = useState(false);

  const form = useForm({
    initialValues: {
      title: "",
      content: "",
    },
    validate: {
      title: (value) =>
        value.length < 2 ? "Title must be at least 2 characters long" : null,
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

  const [autogenTitle, setAutogenTitle] = useState(false);
  return (
    <div className={`${styles.ui} ${opened ? styles.opened : ""}`}>
      <ActionIcon
        variant="default"
        size="md"
        onClick={() => setOpened(!opened)}
        style={{
          fontSize: 18,
        }}
        title="Add an idea"
      >
        {opened ? <X weight="bold" /> : <Plus weight="bold" />}
      </ActionIcon>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Add an idea"
        size="70%"
      >
        <Grid>
          {!autogenTitle && (
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
              checked={autogenTitle}
              onChange={(event) => setAutogenTitle(event.currentTarget.checked)}
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
