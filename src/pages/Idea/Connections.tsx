import {
  Drawer,
  Grid,
  Loader,
  Card,
  Group,
  Title,
  Text,
  Overlay,
  ActionIcon,
} from "@mantine/core";
import { IIdea, IIdeaConnection } from "../../../app/database/models/ideas";
import { Link } from "react-router";
import IdeaPreview from "../../components/Display/Ideas/IdeaPreview";
import { useState } from "react";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { InlineSearch } from "../../components/Search/InlineSearch";
import { Graph, TrashSimple } from "@phosphor-icons/react";

type IConnectionsProps = {
  opened: boolean;
  onClose: () => void;
  loadingIdea: boolean;
  idea: IIdea;
  reloadIdea: () => void;
};

export default function Connections({
  opened,
  onClose,
  loadingIdea,
  idea,
  reloadIdea,
}: IConnectionsProps) {
  const [selectedIdea, setSelectedIdea] = useState<string>();

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

  const [draggedIdea, setDraggedIdea] = useState<IIdea>();
  const [draggingRelatedIdea, setDraggingRelatedIdea] = useState(false);
  const [draggingOverConnectionDrop, setDraggingOverConnectionDrop] =
    useState(false);

  const { load: createConnection, loading: loadingNewConnection } = useFetch<
    { source: string; target: string },
    IIdeaConnection
  >({
    url: "/graph/connection",
    method: "POST",
    body: {
      source: idea?.id.toString(),
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
    setDraggedIdea(undefined);
    setDraggingRelatedIdea(false);
    setDraggingOverConnectionDrop(false);
  };

  const { load: removeConnection } = useFetch({
    url: `/graph/connection`,
    method: "DELETE",
    body: {
      source: idea?.id.toString(),
      target: selectedIdea,
    },
    dependencies: [idea, selectedIdea],
    onSuccess: async (data) => {
      showNotification({
        title: "Connection removed",
        message: "The connection was successfully removed.",
      });
      reloadIdea();
    },
    onError: async (error) => {
      showNotification({
        title: "Connection removal failed",
        message: "The connection could not be removed.",
        color: "red",
      });
    },
  });

  const handleRemoveConnection = () => {
    removeConnection();
  };

  console.log("Selected idea:", selectedIdea);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
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
                            onDragStart={() => setDraggingRelatedIdea?.(true)}
                            onDragEnd={() => setDraggingRelatedIdea?.(false)}
                            setDraggingIdea={(i) => setDraggedIdea?.(i)}
                            draggable={
                              !ideaIsConnected(relatedIdea.id.toString())
                            }
                            hoveringIdea={selectedIdea}
                            setHoveringIdea={setSelectedIdea}
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
                            hoveringIdea={selectedIdea}
                            setHoveringIdea={setSelectedIdea}
                            options={
                              <>
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveConnection();
                                  }}
                                >
                                  <TrashSimple />
                                </ActionIcon>
                              </>
                            }
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
  );
}
