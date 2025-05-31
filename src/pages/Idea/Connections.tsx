import {
  Grid,
  Loader,
  Group,
  Text,
  Overlay,
  ActionIcon,
  Badge,
  Stack,
  Box,
  Button,
} from "@mantine/core";
import { IIdea, IIdeaConnection } from "../../../app/database/models/ideas";
import { Link, useNavigate } from "react-router";
import IdeaPreview from "../../components/Display/Ideas/IdeaPreview";
import { useState } from "react";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import {
  ArrowRight,
  ArrowsClockwise,
  Graph,
  TrashSimple,
} from "@phosphor-icons/react";
import { api } from "../../server/api";
import { similarityToColor, similarityToLevel } from "../../vars/ideas";
import { ideasAreConnected } from "../../utils/graph";
import {
  CompactIdeaCard,
  StandardIdeaCard,
} from "../../components/Display/Ideas/IdeaCards";
import { createIdeaConnection } from "../../utils/ideas";

type IConnectionsProps = {
  loadingIdea: boolean;
  idea: IIdea;
  reloadIdea: () => void;
  computeOutOfDate: boolean;
  triggerCompute: () => void;
  computing: boolean;
};

export default function Connections({
  loadingIdea,
  idea,
  reloadIdea,
  computeOutOfDate,
  triggerCompute,
  computing,
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
    return ideasAreConnected(idea, ideaId);
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

  const createConnectionInline = async (source: string, target: string) => {
    try {
      await api
        .post("/graph/connection", { source, target })
        .then(() => {
          showNotification({
            title: "Connection created",
            message: "The connection was successfully created.",
          });
          reloadIdea();
        })
        .catch((error) => {
          showNotification({
            title: "Connection creation failed",
            message: "The connection could not be created.",
            color: "red",
          });
        });
    } catch (error) {
      console.error(error);
    }
  };

  const disconnectInline = async (source: string, target: string) => {
    try {
      await api
        .delete("/graph/connection", {
          data: {
            source,
            target,
          },
        })
        .then(() => {
          showNotification({
            title: "Connection created",
            message: "The connection was successfully created.",
          });
          reloadIdea();
        })
        .catch((error) => {
          showNotification({
            title: "Connection creation failed",
            message: "The connection could not be created.",
            color: "red",
          });
        });
    } catch (error) {
      console.error(error);
    }
  };

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

  const handleRemoveConnection = (target: string) => {
    disconnectInline(idea.id.toString(), target);
  };

  const handleCreateConnection = (target: string) => {
    createIdeaConnection(idea.id.toString(), target);
    reloadIdea();
  };

  const navigate = useNavigate();

  return (
    <Grid>
      {loadingIdea && (
        <Grid.Col span={{ sm: 12 }}>
          <Loader size="xs" />
        </Grid.Col>
      )}
      {computeOutOfDate && (
        <Grid.Col span={{ sm: 12 }}>
          <Text c="dimmed" size="sm" mb="sm">
            These may be out of date...
          </Text>
          <Button
            onClick={triggerCompute}
            variant="light"
            size="xs"
            leftSection={computing ? <Loader size="xs" /> : <ArrowsClockwise />}
          >
            Refresh
          </Button>
        </Grid.Col>
      )}
      <Grid.Col span={{ sm: 12 }}>
        <Box
          onDragOver={() => {
            setDraggingOverConnectionDrop(true);
          }}
          onDragLeave={() => {
            setDraggingOverConnectionDrop(false);
          }}
          pos="relative"
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
                radius={"lg"}
              >
                <Group
                  align="center"
                  justify="center"
                  style={{ height: "100%" }}
                >
                  <Text fw="bold" c="white" mx="lg">
                    Drop here to create a connection
                  </Text>
                </Group>
              </Overlay>
            )}
            <Grid.Col>
              {draggingRelatedIdea && (
                <Text size="sm">Drag idea here to create a connection</Text>
              )}
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                <Text size="sm">Ideas you've connected...</Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                {idea?.connections && idea.connections?.length > 0 ? (
                  idea.connections?.map((connection, i) => {
                    return (
                      <CompactIdeaCard
                        style={{
                          width: "100%",
                        }}
                        idea={connection}
                        onMouseEnterCard={() => {
                          setSelectedIdea(connection.id.toString());
                        }}
                        onMouseLeaveCard={() => {
                          setSelectedIdea(undefined);
                        }}
                        onCardClick={() => {
                          // navigate(`/idea/${connection.id.toString()}`);
                        }}
                        actions={[
                          {
                            id: "View",
                            label: "View",
                            icon: <ArrowRight />,
                            onClick: (e) => {
                              e.stopPropagation();
                              navigate(`/idea/${connection.id.toString()}`);
                            },
                          },
                          {
                            id: "remove_connection",
                            label: "Remove",
                            icon: <TrashSimple />,
                            onClick: (e) => {
                              e.stopPropagation();
                              handleRemoveConnection(connection.id.toString());
                            },
                            color: "red",
                          },
                        ]}
                      />
                    );
                  })
                ) : (
                  <Text c="dimmed" size="sm">
                    No connections yet. Try dragging a related idea!
                  </Text>
                )}
              </Group>
            </Grid.Col>
          </Grid>
        </Box>
      </Grid.Col>
      <Grid.Col span={{ sm: 12 }} />
      <Grid.Col span={{ sm: 12 }}>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Text size="sm">Some similar ideas to this one...</Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            {idea?.relatedIdeas && idea.relatedIdeas?.length > 0 ? (
              <Stack>
                {idea.relatedIdeas?.map((relatedIdea) => {
                  const distance = relatedIdea.distance;
                  const level = similarityToLevel(distance);
                  const color = similarityToColor[level];

                  return (
                    <CompactIdeaCard
                      idea={relatedIdea}
                      style={{
                        width: "100%",
                      }}
                      onMouseEnterCard={() => {
                        setSelectedIdea(relatedIdea.id.toString());
                      }}
                      onMouseLeaveCard={() => {
                        setSelectedIdea(undefined);
                      }}
                      actions={[
                        {
                          id: "View",
                          label: "View",
                          icon: <ArrowRight />,
                          onClick: (e) => {
                            e.stopPropagation();
                            navigate(`/idea/${relatedIdea.id.toString()}`);
                          },
                        },
                        {
                          disabled: ideaIsConnected(relatedIdea.id.toString()),
                          icon: <Graph />,
                          id: "create_connection",
                          label: "Connect",
                          onClick: (e) => {
                            e.stopPropagation();
                            handleCreateConnection(relatedIdea.id.toString());
                          },
                        },
                      ]}
                      onDragStartCard={() => {
                        setDraggingRelatedIdea?.(true);
                        setDraggedIdea(relatedIdea);
                      }}
                      onDragEndCard={() => {
                        setDraggingRelatedIdea?.(false);
                        setDraggedIdea(undefined);
                      }}
                      draggable={!ideaIsConnected(relatedIdea.id.toString())}
                      showDefaultDragHandle={
                        !ideaIsConnected(relatedIdea.id.toString())
                      }
                      tags={[
                        {
                          id: "level",
                          label: level,
                          color,
                        },
                      ]}
                    />
                  );
                })}
              </Stack>
            ) : (
              <Text>No related ideas yet.</Text>
            )}
          </Grid.Col>
        </Grid>
      </Grid.Col>
    </Grid>
  );
}
