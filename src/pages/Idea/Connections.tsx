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
  Button,
  Pill,
  Badge,
  Stack,
} from "@mantine/core";
import { IIdea, IIdeaConnection } from "../../../app/database/models/ideas";
import { Link } from "react-router";
import IdeaPreview from "../../components/Display/Ideas/IdeaPreview";
import { useState } from "react";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { InlineSearch } from "../../components/Search/InlineSearch";
import { Graph, Lightbulb, TrashSimple } from "@phosphor-icons/react";
import { api } from "../../server/api";
import { similarityToColor, similarityToLevel } from "../../vars/ideas";

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

  const titleClamped = (title: string) => {
    return title.length > 20 ? `${title.slice(0, 20)}...` : title;
  };

  return (
    <Grid>
      {loadingIdea && (
        <Grid.Col span={{ sm: 12 }}>
          <Loader size="lg" />
        </Grid.Col>
      )}
      <Grid.Col span={{ sm: 12 }}>
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
              <Group align="center" justify="center" style={{ height: "100%" }}>
                <Text fw="bold">Drop here to create a connection</Text>
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
      </Grid.Col>
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
                          <Text>{formattedDistance(relatedIdea.distance)}</Text>
                        }
                        onDragStart={() => setDraggingRelatedIdea?.(true)}
                        onDragEnd={() => setDraggingRelatedIdea?.(false)}
                        setDraggingIdea={(i) => setDraggedIdea?.(i)}
                        draggable={!ideaIsConnected(relatedIdea.id.toString())}
                        hoveringIdea={selectedIdea}
                        setHoveringIdea={setSelectedIdea}
                        tags={[
                          <Badge color={color} variant="light" size="xs">
                            {level}
                          </Badge>,
                        ]}
                      />
                    </Link>
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
