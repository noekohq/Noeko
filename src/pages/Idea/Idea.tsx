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
      source: idea?.id.toString() || "",
      target: draggedIdea?.id.toString() || "",
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

  const formattedDistance = (distance: number) => {
    return distance.toFixed(2);
  };

  const ideaIsConnected = (ideaId: string) => {
    // check idea.connections both incoming and outgoing
    if (!idea) {
      return false;
    }
    return idea.connections?.some((connection) => connection.id === ideaId);
  };

  const [hoveringIdea, setHoveringIdea] = useState<string>();

  const { load: removeConnection } = useFetch({
    url: `/graph/ideas/`,
  });

  console.log("Idea: ", idea);

  return (
    <div className={styles.idea}>
      <Drawer
        opened={connectionDrawerOpened}
        onClose={closeConnectionDrawer}
        offset={14}
        radius="lg"
        position="bottom"
        size="70%"
      >
        <Grid>
          {loadingIdea && (
            <Grid.Col span={{ sm: 12 }}>
              <Loader size="lg" />
            </Grid.Col>
          )}
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Card
              p="lg"
              radius="lg"
              h="50vh"
              style={{
                overflowY: "scroll",
                scrollbarWidth: "thin",
                scrollbarColor: "transparent transparent",
              }}
            >
              <Grid>
                <Grid.Col span={{ sm: 12 }}>
                  <Group align="end">
                    <Title order={2}>Related Ideas</Title>
                    <Text c="dimmed">Drag ideas to connect them.</Text>
                  </Group>
                </Grid.Col>
                <Grid.Col
                  span={{ sm: 12 }}
                  style={{
                    overflowY: "scroll",
                    scrollbarWidth: "thin",
                    scrollbarColor: "transparent transparent",
                  }}
                >
                  {idea?.relatedIdeas && idea.relatedIdeas?.length > 0 ? (
                    <Group>
                      {idea.relatedIdeas?.map((relatedIdea) => {
                        return (
                          <Link
                            key={relatedIdea.id + "related"}
                            to={`/idea/${relatedIdea.id}`}
                            style={{
                              textDecoration: "none",
                            }}
                          >
                            <IdeaPreview
                              idea={relatedIdea}
                              subtext={
                                <Text>
                                  {formattedDistance(relatedIdea.distance)}
                                </Text>
                              }
                              onDragStart={() => setDraggingRelatedIdea(true)}
                              onDragEnd={() => setDraggingRelatedIdea(false)}
                              setDraggingIdea={(i) => setDraggedIdea(i)}
                              draggable={
                                !ideaIsConnected(relatedIdea.id.toString())
                              }
                              setHoveringIdea={(i) => {
                                setHoveringIdea(i);
                              }}
                              hoveringIdea={hoveringIdea}
                            />
                          </Link>
                        );
                      })}
                    </Group>
                  ) : (
                    <Text>No related ideas yet.</Text>
                  )}
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
                {draggingOverConnectionDrop && draggedIdea && (
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
                          updatedBody: {
                            source: idea.id.toString(),
                            target: i.id.toString(),
                          },
                        });
                      }}
                    />
                  </Grid.Col>
                )}
                <Grid.Col span={{ sm: 12 }}>
                  <Group>
                    <Text fw="bold">Connected</Text>
                    <Graph />
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <InlineSearch
                    onSelect={(i) => {
                      if (!idea) return;
                      createConnection({
                        updatedBody: {
                          source: idea?.id.toString(),
                          target: i.id.toString(),
                        },
                      });
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <Group>
                    {idea?.connections && idea.connections?.length > 0 ? (
                      idea.connections?.map((connection) => {
                        return (
                          <Link
                            to={`/idea/${connection.id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                            key={connection.id + "connected"}
                          >
                            <IdeaPreview
                              idea={connection}
                              draggable={false}
                              hoveringIdea={hoveringIdea}
                              setHoveringIdea={setHoveringIdea}
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
      <Drawer
        opened={overviewDrawerOpened}
        onClose={closeOverviewDrawer}
        offset={14}
        radius="lg"
        position="right"
        size="70%"
      >
        <Text>
          <Group>
            <Sparkle />
            Overview
          </Group>
        </Text>
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

type IdeaPreviewProps = {
  idea: IIdea;
  subtext?: JSX.Element;
  setDraggingIdea?: (idea: IIdea | null) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  hoveringIdea: string | undefined;
  setHoveringIdea: (hoveringIdea: string | undefined) => void;
};

function IdeaPreview({
  idea,
  subtext,
  setDraggingIdea,
  onDragStart,
  onDragEnd,
  draggable = false,
  hoveringIdea,
  setHoveringIdea,
}: IdeaPreviewProps) {
  const [dragging, setDragging] = useState(false);

  const summary =
    idea.derived?.generative_summary?.sentenceSummary || "No summary provided.";

  return (
    <Card
      px="lg"
      radius="lg"
      draggable={draggable}
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
      onMouseEnter={() => {
        setHoveringIdea(idea.id.toString());
      }}
      onMouseLeave={() => {
        setHoveringIdea(undefined);
      }}
      className={`${styles.ideaPreview} ${hoveringIdea === idea.id ? styles.hovered : ""}`}
    >
      <HoverCard width={300}>
        <HoverCard.Target>
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <Group gap="xs">
                {subtext && (
                  <Text size="xs" c="dimmed">
                    {subtext}
                  </Text>
                )}
                <Text fw="bold">{idea.title}</Text>
              </Group>
            </Grid.Col>
          </Grid>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text>{summary || "No summary provided."}</Text>
        </HoverCard.Dropdown>
      </HoverCard>
    </Card>
  );
}
