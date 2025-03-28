import { Link, useNavigate, useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import {
  IIdea,
  IIdeaAsRelation,
  IIdeaConnection,
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
  Pill,
  Space,
  Overlay,
  Box,
  Drawer,
  Tooltip,
  Kbd,
  ScrollArea,
  Flex,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useAlert } from "../../contexts/AlertContext";
import TextEditor from "../../components/TextEditor/TextEditor";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  Brain,
  Circle,
  Lightbulb,
  Magnet,
  Shapes,
  Sparkle,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import { InlineSearch } from "../../components/Search/InlineSearch";
import { useDisclosure } from "@mantine/hooks";

export default function Idea() {
  const { ideaId } = useParams();
  const { setAlert } = useAlert();

  const navigate = useNavigate();

  const {
    data: idea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<
    undefined,
    IIdea & {
      relatedIdeas: IIdeaAsRelation[];
      connections: { incoming: IIdea[]; outgoing: IIdea[] };
    }
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
      showNotification({
        title: "Success",
        message: "Idea title updated successfully",
      });
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

  const [draggingRelatedIdea, setDraggingRelatedIdea] = useState(false);
  const [draggedIdea, setDraggedIdea] = useState<IIdea | null>(null);
  const [draggingOverConnectionDrop, setDraggingOverConnectionDrop] =
    useState(false);

  const { load: createConnection, loading: loadingNewConnection } = useFetch<
    { source: string; target: string },
    IIdeaConnection
  >({
    url: "/graph/connection",
    method: "POST",
    body: {
      source: idea?.id || "",
      target: draggedIdea?.id || "",
    },
    dependencies: [idea, draggedIdea],
    onSuccess: async (data) => {
      showNotification({
        title: "Connection created",
        message: "The connection was successfully created.",
      });
      reloadIdea();
    },
    onError: async (error) => {
      showNotification({
        title: "Connection creation failed",
        message: "The connection could not be created.",
        color: "red",
      });
    },
  });

  const handleDropIdeaInConnection = async () => {
    if (!draggedIdea) return;
    try {
      await createConnection();
    } catch (error) {
      console.error(error);
    }
    setDraggedIdea(null);
    setDraggingRelatedIdea(false);
    setDraggingOverConnectionDrop(false);
  };

  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure();

  useEffect(() => {
    // register a keyboard shortcut to open the drawer on ctrl (or command) i
    const k = document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "i") {
        openDrawer();
      }
    });
  }, [openDrawer]);

  const formattedDistance = (distance: number) => {
    return distance.toFixed(2);
  };

  if (loadingIdea) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.idea}>
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        offset={14}
        radius="lg"
        position="bottom"
        size="70%"
      >
        <Grid>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Card p="lg" radius="lg">
              <Grid>
                <Grid.Col>
                  <Group>
                    <Title order={2}>Related Ideas</Title>
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <ScrollArea h={"40vh"} scrollbars="y" offsetScrollbars>
                    {idea && idea.relatedIdeas?.length > 0 ? (
                      <Group>
                        {idea.relatedIdeas?.map((relatedIdea) => {
                          return (
                            <Link
                              key={relatedIdea.id}
                              to={`/idea/${relatedIdea.id}`}
                              style={{
                                textDecoration: "none",
                              }}
                            >
                              <IdeaPreview
                                idea={relatedIdea}
                                subtext={formattedDistance(
                                  relatedIdea.distance,
                                )}
                                onDragStart={() => setDraggingRelatedIdea(true)}
                                onDragEnd={() => setDraggingRelatedIdea(false)}
                                setDraggingIdea={(i) => setDraggedIdea(i)}
                              />
                            </Link>
                          );
                        })}
                      </Group>
                    ) : (
                      <Text>No related ideas yet.</Text>
                    )}
                  </ScrollArea>
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Card
              p="lg"
              radius="lg"
              onDragOver={() => {
                setDraggingOverConnectionDrop(true);
              }}
              onDragLeave={() => {
                setDraggingOverConnectionDrop(false);
              }}
            >
              <Grid>
                {draggingOverConnectionDrop && (
                  <Overlay
                    backgroundOpacity={0.5}
                    blur={5}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      handleDropIdeaInConnection();
                    }}
                  >
                    <Group
                      align="center"
                      justify="center"
                      style={{ height: "100%" }}
                    >
                      <Text fw="bold">Drop here to create a connection</Text>
                    </Group>
                  </Overlay>
                )}
                <Grid.Col>
                  <Group gap="md">
                    {loadingNewConnection && <Loader size={"md"} />}
                    <Title order={2}>Connections</Title>
                  </Group>
                  {draggingRelatedIdea && (
                    <Text size="sm">Drag idea here to create a connection</Text>
                  )}
                </Grid.Col>
                {idea && (
                  <Grid.Col span={{ sm: 12 }}>
                    <InlineSearch
                      placeholder="Search idea to connect..."
                      onSelect={(i) => {
                        createConnection({
                          updatedBody: { source: idea.id, target: i.id },
                        });
                      }}
                    />
                  </Grid.Col>
                )}
                <Grid.Col span={{ sm: 12 }}>
                  <Group>
                    <Text fw="bold">Incoming</Text>
                    <ArrowLeft weight="bold" />
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <Group>
                    {idea && idea.connections.incoming?.length > 0 ? (
                      idea.connections.incoming.map((connection) => {
                        return (
                          <Link
                            to={`/idea/${connection.id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <IdeaPreview
                              key={connection.id}
                              idea={connection}
                              subtext={<ArrowLeft weight="bold" />}
                            />
                          </Link>
                        );
                      })
                    ) : (
                      <Text c="dimmed">No connections yet.</Text>
                    )}
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }} />
                <Grid.Col span={{ sm: 12 }}>
                  <Group>
                    <Text fw="bold">Outgoing</Text>
                    <ArrowRight weight="bold" />
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <Group>
                    {idea && idea.connections.outgoing?.length > 0 ? (
                      idea.connections.outgoing.map((connection) => {
                        return (
                          <Link
                            to={`/idea/${connection.id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <IdeaPreview
                              key={connection.id}
                              idea={connection}
                              subtext={<ArrowRight weight="bold" />}
                            />
                          </Link>
                        );
                      })
                    ) : (
                      <Text c="dimmed">No connections yet.</Text>
                    )}
                  </Group>
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>
        </Grid>
      </Drawer>
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
                  openDrawer();
                }}
              >
                <Lightbulb weight="bold" />
              </ActionIcon>
            </Tooltip>
            <Button
              style={{
                opacity: 0,
              }}
              onClick={() => {
                showNotification({
                  title: "Summoned!",
                  message: "Summoned hot MILFs in your area!",
                });
              }}
            >
              <Group gap={8}>
                <Brain weight="bold" /> + <Magnet weight="bold" />
              </Group>
            </Button>
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
            <Text>{idea?.contentSummary || "No summary provided."}</Text>
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

type IdeaPreviewProps = {
  idea: IIdea | IIdeaAsRelation;
  subtext: JSX.Element;
  setDraggingIdea?: (idea: IIdea | IIdeaAsRelation | null) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
};

function IdeaPreview({
  idea,
  subtext,
  setDraggingIdea,
  onDragStart,
  onDragEnd,
}: IdeaPreviewProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <Card
      p="lg"
      radius="lg"
      draggable={!!onDragStart}
      onDragStart={(e) => {
        setDraggingIdea?.(idea);
        onDragStart?.(e);
        setDragging(true);
      }}
      onDragEnd={(e) => {
        setDraggingIdea?.(null);
        onDragEnd?.(e);
        setDragging(false);
      }}
      withBorder={!dragging}
      shadow={dragging ? "md" : ""}
    >
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {subtext}
            </Text>
            <Text fw="bold">{idea.title}</Text>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Text size="sm" c="dimmed">
            {idea.contentSummary}
          </Text>
        </Grid.Col>
      </Grid>
    </Card>
  );
}
