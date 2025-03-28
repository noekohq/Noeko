import { Link, useNavigate, useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import {
  IIdea,
  IIdeaAsRelation,
  IIdeaForm,
} from "../../../app/database/models/idea";
import {
  ActionIcon,
  Button,
  Grid,
  Group,
  Title,
  Loader,
  Text,
  List,
  Card,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useAlert } from "../../contexts/AlertContext";
import TextEditor from "../../components/TextEditor/TextEditor";
import { ArrowLeft, Shapes } from "@phosphor-icons/react";

export default function Idea() {
  const { ideaId } = useParams();
  const { setAlert } = useAlert();

  const navigate = useNavigate();

  const { data: idea, load: reloadIdea } = useFetch<
    undefined,
    IIdea & { relatedIdeas: IIdeaAsRelation[]; connections: IIdea[] }
  >({
    url: `/graph/ideas/${ideaId}?withRelatedIdeas=true&withConnections=true`,
    method: "GET",
    runOnMount: true,
  });

  const [title, setTitle] = useState(idea?.title);
  useEffect(() => {
    setTitle(idea?.title);
  }, [idea?.title]);

  const { load: submitTitle } = useFetch<Partial<IIdeaForm>, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "PUT",
    body: {
      title,
    },
    dependencies: [title],
    onSuccess: () => {
      reloadIdea();
    },
    onError: (error) => {
      setAlert({
        title: "Error",
        message: "There was an error updating the idea",
        type: "error",
      });
    },
  });

  useEffect(() => {
    title && title !== idea?.title && submitTitle();
    if (!title) {
      setAlert({
        title: "Error",
        message: "Title is required",
        type: "error",
      });
    }
  }, [title]);

  const [content, setContent] = useState(idea?.content || "");
  useEffect(() => {
    setContent(idea?.content || "");
  }, [idea?.content]);

  console.log("Content: ", content);

  const { load: submitContent } = useFetch<Partial<IIdeaForm>, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "PUT",
    body: {
      content,
    },
    dependencies: [content],
    onSuccess: () => {
      reloadIdea();
    },
    onError: (error) => {
      setAlert({
        title: "Error",
        message: "There was an error updating the idea",
        type: "error",
      });
    },
  });

  useEffect(() => {
    content && content !== idea?.content && submitContent();
  }, [content]);

  console.log("Idea: ", idea);
  const { load: embedIdea, loading: loadingEmbeddings } = useFetch({
    url: `/graph/ideas/${ideaId}/embed`,
    method: "POST",
    onSuccess: () => {
      reloadIdea();
    },
    onError: (error) => {
      setAlert({
        title: "Error",
        message: "There was an error generating embeddings",
        type: "error",
      });
    },
  });

  const embeddingsOutOfDate = () => {
    if (!idea) return false;
    if (!idea.embeddingsUpdatedAt) return true;
    return new Date(idea.contentUpdatedAt) > new Date(idea.embeddingsUpdatedAt);
  };

  const statusText = () => {
    let text = "";
    if (loadingEmbeddings) {
      text += "Loading embeddings.";
    }
    if (embeddingsOutOfDate()) {
      text += "Embeddings out of date.";
    }
    return text;
  };

  console.log("Connections:", idea?.connections?.length);

  return (
    <div className={styles.idea}>
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Group gap={14}>
            <ActionIcon
              onClick={() => {
                navigate("/");
              }}
              variant="default"
            >
              <ArrowLeft weight="bold" />
            </ActionIcon>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Text>{statusText()}</Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Group>
            {embeddingsOutOfDate() && (
              <Button
                leftSection={
                  loadingEmbeddings ? (
                    <Loader size="sm" />
                  ) : (
                    <Shapes weight="bold" />
                  )
                }
                disabled={loadingEmbeddings}
                onClick={() => {
                  embedIdea();
                }}
              >
                Generate Embeddings
              </Button>
            )}
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Title
            order={1}
            contentEditable
            onBlur={(e) => setTitle(e.currentTarget.innerText)}
            dangerouslySetInnerHTML={{
              __html: title || "Hold on...",
            }}
          />
        </Grid.Col>
        <Grid.Col span={12} />
        <Grid.Col span={{ sm: 12 }}>
          <TextEditor
            content={content}
            onBlur={(value) => {
              setContent(value);
            }}
          />
        </Grid.Col>
        <Grid.Col span={12} />
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <Card p="lg" radius="lg">
            <Grid>
              <Grid.Col>
                <Title order={2}>Connections</Title>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                {idea && idea.connections?.length > 0 ? (
                  <List type="unordered">
                    {idea?.connections?.map((connection) => (
                      <List.Item key={connection.id}>
                        {connection.title}
                      </List.Item>
                    ))}
                  </List>
                ) : (
                  <Text>No connections yet.</Text>
                )}
              </Grid.Col>
            </Grid>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <Card p="lg" radius="lg">
            <Grid>
              <Grid.Col>
                <Title order={2}>Related Ideas</Title>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                {idea && idea.relatedIdeas?.length > 0 ? (
                  <Group>
                    {idea?.relatedIdeas?.map((relatedIdea) => (
                      <Link to={`/idea/${relatedIdea.id}`}>
                        <Button variant="light" key={relatedIdea.id}>
                          {relatedIdea.title}
                        </Button>
                      </Link>
                    ))}
                  </Group>
                ) : (
                  <Text>No related ideas yet.</Text>
                )}
              </Grid.Col>
            </Grid>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}
