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
import {
  IIdea,
  IIdeaConnection,
  ISafeIdea,
} from "../../../app/database/models/ideas";
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
import { createIdeaConnection, removeIdeaConnection } from "../../utils/ideas";

type IConnectionsProps = {
  loadingIdea: boolean;
  idea: ISafeIdea;
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
    removeIdeaConnection(idea.id.toString(), target);
  };

  const handleCreateConnection = (target: string) => {
    createIdeaConnection(idea.id.toString(), target);
    reloadIdea();
  };

  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData) as { ideaId: string };
      const { ideaId } = data;
      if (ideaIsConnected(ideaId)) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this idea again.",
          color: "yellow",
        });
        return;
      }
      console.log("Dropped connection id: ", ideaId);
      await createIdeaConnection(idea.id.toString(), ideaId);
      reloadIdea();
    } catch (error) {
      console.log("Error creating connection: ", error);
    } finally {
      setDraggingOverConnectionDrop(false);
    }
  };

  const navigate = useNavigate();

  return (
    <Grid>
      {computeOutOfDate && (
        <Grid.Col span={{ sm: 12 }}>
          <Group align="center">
            <Text c="dimmed" size="sm">
              These may be out of date...
            </Text>
            <ActionIcon onClick={triggerCompute} variant="light" size="sm">
              {computing ? <Loader size="xs" /> : <ArrowsClockwise />}
            </ActionIcon>
          </Group>
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
            {draggingOverConnectionDrop && (
              <Overlay
                backgroundOpacity={0}
                blur={4}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  handleConnectionDrop(e);
                }}
                radius={"lg"}
              >
                <Group
                  align="center"
                  justify="center"
                  style={{ height: "100%" }}
                >
                  <Text c="white" mx="lg" size="sm">
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
              <Group align="center">
                <Text size="sm">Ideas you've connected...</Text>
                {loadingIdea && <Loader size="xs" color="gray" />}
              </Group>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                {idea?.connections && idea.connections?.length > 0 ? (
                  idea.connections?.map((connection, i) => {
                    return (
                      <CompactIdeaCard
                        key={connection.id.toString()}
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
                          navigate(`/idea/${connection.id.toString()}`);
                        }}
                        actions={[
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
                      key={relatedIdea.id.toString()}
                      idea={relatedIdea}
                      style={{
                        width: "100%",
                      }}
                      draggable
                      onCardClick={() => {
                        navigate(`/idea/${relatedIdea.id.toString()}`);
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
