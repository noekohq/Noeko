import Graph from "../../components/Graph/Index";
import { IGraph } from "../../declarations/graph";
import { useRef, useState } from "react";
import styles from "./Home.module.scss";
import { ActionIcon, Button, Grid, Group, Modal } from "@mantine/core";
import { Plus, X } from "@phosphor-icons/react";
import { useForm } from "@mantine/form";
import TextEditor from "../../components/TextEditor/TextEditor";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { IDBGraph, IIdea } from "../../../app/database/models/idea";

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

  const [newIdea, setNewIdea] = useState<string>("");
  const { load: addIdea } = useFetch<{ content: string }, IIdea>({
    url: "/graph/ideas",
    method: "POST",
    body: {
      content: newIdea,
    },
    onSuccess: () => {
      showNotification({
        title: "Idea added successfully",
        message: "Your idea has been added to the graph.",
        color: "green",
      });
    },
    onFinally: () => {
      reloadGraph();
    },
  });

  return (
    <div ref={containerRef} className={styles.container}>
      <Graph
        graph={localData}
        onNodeClick={(e, n) => {
          console.log("clicked node: ", e, n);
        }}
      />
      <AddNode
        addNode={(content) => {
          addIdea({
            updatedBody: {
              content,
            },
          });
        }}
        setContent={(c) => {
          setNewIdea(c);
        }}
      />
    </div>
  );
}

type UIProps = {
  addNode: (content: string) => void;
  setContent: (content: string) => void;
};

function AddNode({ addNode, setContent }: UIProps) {
  const [opened, setOpened] = useState(false);

  const form = useForm({
    initialValues: {
      content: "",
    },
    validate: {
      content: (value) =>
        value.length < 2 ? "Content must be at least 2 characters long" : null,
    },
  });

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
          <Grid.Col span={{ sm: 12 }}>
            <TextEditor
              content=""
              onBlur={(content) => {
                form.setFieldValue("content", content);
                setContent(content);
              }}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="end">
              <Button variant="default" onClick={() => setOpened(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const { hasErrors, errors } = form.validate();
                  if (hasErrors) {
                    showNotification({
                      title: "Errors",
                      message: Object.values(errors)[0],
                      color: "red",
                    });
                    return;
                  }
                  form.reset();
                  addNode(form.values.content);
                  setOpened(false);
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
