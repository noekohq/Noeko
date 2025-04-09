import { Link, useNavigate, useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import {
  IIdea,
  IIdeaConnection,
  IIdeaForm,
} from "../../../app/database/models/ideas";
import {
  ActionIcon,
  Button,
  Grid,
  Group,
  Title,
  Loader,
  Text,
  Card,
  Space,
  Overlay,
  Drawer,
  Tooltip,
  Kbd,
  HoverCard,
} from "@mantine/core";
import { useEffect, useState } from "react";
import TextEditor from "../../components/TextEditor/TextEditor";
import {
  ArrowLeft,
  ArrowsClockwise,
  Graph,
  ListMagnifyingGlass,
  Shapes,
  Sparkle,
  TreeStructure,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import { InlineSearch } from "../../components/Search/InlineSearch";
import { useDisclosure } from "@mantine/hooks";
import Connections from "./Connections";
import Overview from "./Overview";

export default function Idea() {
  const { ideaId } = useParams();

  const navigate = useNavigate();

  const {
    data: idea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    query: {
      withRelatedIdeas: "true",
      withConnections: "true",
      withDerived: "true",
    },
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
      showNotification({
        title: "Success",
        message: "Idea title updated successfully",
      });
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: "There was an error updating the idea",
        color: "red",
      });
    },
  });

  useEffect(() => {
    title && title !== idea?.title && submitTitle();
  }, [title]);

  const [content, setContent] = useState(idea?.content || "");
  useEffect(() => {
    setContent(idea?.content || "");
  }, [idea?.content]);

  const { load: submitContent, loading: loadingContentUpdate } = useFetch<
    Partial<IIdeaForm>,
    IIdea
  >({
    url: `/graph/ideas/${ideaId}`,
    method: "PUT",
    body: {
      content,
    },
    dependencies: [content],
    onSuccess: () => {
      reloadIdea();
      showNotification({
        title: "Success",
        message: "Idea updated successfully",
      });
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: "There was an error updating the idea",
        color: "red",
      });
    },
  });

  useEffect(() => {
    content && content !== idea?.content && submitContent();
  }, [content]);

  const { load: embedIdea, loading: loadingEmbeddings } = useFetch({
    url: `/graph/ideas/${ideaId}/embed`,
    method: "POST",
    onSuccess: () => {
      reloadIdea();
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: "There was an error generating embeddings",
        color: "red",
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
      text += "Loading embeddings. ";
    }
    if (embeddingsOutOfDate()) {
      text += "Embeddings are out of date. ";
    }
    if (!idea?.embeddings || idea.embeddings?.length === 0) {
      text += "No embeddings available. ";
    }
    return text;
  };

  const statusBlockShow =
    statusText().length || embeddingsOutOfDate() || !idea?.embeddings;

  const [
    connectionDrawerOpened,
    { close: closeConnectionDrawer, toggle: toggleConnectionDrawer },
  ] = useDisclosure();
  const [
    overviewDrawerOpened,
    { close: closeOverviewDrawer, toggle: toggleOverviewDrawer },
  ] = useDisclosure();

  useEffect(() => {
    // register a keyboard shortcut to open the drawer on ctrl (or command) i
    const k = document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "i") {
        toggleConnectionDrawer();
      }
    });

    const l = document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "o") {
        toggleOverviewDrawer();
      }
    });

    return () => {
      document.removeEventListener("keydown", k as any);
      document.removeEventListener("keydown", l as any);
    };
  }, [toggleConnectionDrawer]);

  useEffect(() => {
    closeConnectionDrawer();
    closeOverviewDrawer();
  }, []);

  console.log("Idea: ", idea);

  return (
    <div className={styles.idea}>
      {idea && (
        <Connections
          opened={connectionDrawerOpened}
          onClose={closeConnectionDrawer}
          loadingIdea={loadingIdea}
          idea={idea}
          reloadIdea={reloadIdea}
        />
      )}
      {idea && (
        <Overview
          opened={overviewDrawerOpened}
          onClose={closeOverviewDrawer}
          loadingIdea={loadingIdea}
          idea={idea}
          reloadIdea={async () => {
            reloadIdea();
          }}
        />
      )}
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
            <ActionIcon
              variant="default"
              onClick={() => {
                submitContent();
              }}
            >
              {loadingContentUpdate ? (
                <Loader size="xs" color="white" />
              ) : (
                <ArrowsClockwise weight="bold" />
              )}
            </ActionIcon>
            <Tooltip label={<Kbd>Ctrl + I</Kbd>}>
              <ActionIcon
                onClick={() => {
                  toggleConnectionDrawer();
                }}
              >
                <TreeStructure />
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              onClick={() => {
                toggleOverviewDrawer();
              }}
            >
              <ListMagnifyingGlass />
            </ActionIcon>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Space my="lg" />
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
        <Grid.Col span={{ sm: 12 }}>
          <Card radius="lg">
            <Text fw="bold" c="dimmed">
              <Sparkle weight="bold" /> Content Summary
            </Text>
            <Text>
              {idea?.derived?.generative_summary?.sentenceSummary ||
                "No summary provided."}
            </Text>
          </Card>
        </Grid.Col>
        {statusBlockShow && (
          <Grid.Col span={{ sm: 12 }}>
            <Card p="lg" radius="lg">
              <Grid>
                {statusText && (
                  <Grid.Col span={{ sm: 12 }}>
                    <Text>{statusText()}</Text>
                  </Grid.Col>
                )}
                <Grid.Col span={12}>
                  <Group>
                    {(embeddingsOutOfDate() || !idea?.embeddings) && (
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
              </Grid>
            </Card>
          </Grid.Col>
        )}
        <Grid.Col span={12} />
        <Grid.Col span={{ sm: 12 }}>
          <TextEditor
            content={content}
            onBlur={(value) => {
              setContent(value);
            }}
          />
        </Grid.Col>
      </Grid>
    </div>
  );
}
