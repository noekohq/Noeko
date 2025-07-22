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
  HoverCard,
  Accordion,
} from "@mantine/core";
import {
  IIdea,
  IIdeaAsRelation,
  IIdeaConnection,
  ISafeIdea,
} from "../../../app/database/models/ideas";
import { Link, useNavigate } from "react-router";
import IdeaPreview from "../../components/Display/Ideas/IdeaPreview";
import { useEffect, useState } from "react";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import {
  ArrowRight,
  ArrowRightIcon,
  ArrowsClockwise,
  ArrowsClockwiseIcon,
  Graph,
  GraphIcon,
  InfoIcon,
  NotePencilIcon,
  TrashSimple,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { api } from "../../server/api";
import { similarityToColor, similarityToLevel } from "../../vars/ideas";
import { ideasAreConnected } from "../../utils/graph";
import {
  CompactIdeaCard,
  StandardIdeaCard,
} from "../../components/Display/Ideas/IdeaCards";
import { createIdeaConnection, removeIdeaConnection } from "../../utils/ideas";
import IdeaButton from "../../components/Display/Ideas/IdeaButton";
import { useInteraction } from "../../contexts/InteractionContext";
import IdeaCard from "../../components/Display/Ideas/Interactions/IdeaCard";

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
  const { load: loadConnections, data: connections } = useFetch<
    undefined,
    ISafeIdea[]
  >({
    url: `/ideas/${idea.id.toString()}/connections`,
  });
  const { load: loadRelated, data: related } = useFetch<
    undefined,
    IIdeaAsRelation[]
  >({
    url: `/ideas/${idea.id.toString()}/related`,
  });

  useEffect(() => {
    loadConnections();
    loadRelated();
  }, [idea.id.toString()]);

  const handleReload = async () => {
    await loadConnections();
    await loadRelated();
    reloadIdea();
  };

  const ideaIsConnected = (ideaId: string) => {
    if (!idea) {
      console.log("Not testing connection on unconnected idea");
      return false;
    }
    return connections?.find(
      (connection) => connection.id.toString() === ideaId,
    );
  };

  const [draggingRelatedIdea, setDraggingRelatedIdea] = useState(false);
  const [draggingOverConnectionDrop, setDraggingOverConnectionDrop] =
    useState(false);

  const handleRemoveConnection = (target: string) => {
    removeIdeaConnection(idea.id.toString(), target);
    handleReload();
  };

  const handleCreateConnection = (target: string) => {
    createIdeaConnection(idea.id.toString(), target);
    handleReload();
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
      handleReload();
    } catch (error) {
      console.log("Error creating connection: ", error);
    } finally {
      setDraggingOverConnectionDrop(false);
    }
  };

  const navigate = useNavigate();

  const {
    actions: { newConnectedIdea },
  } = useInteraction();

  return (
    <Grid>
      {computeOutOfDate && (
        <Grid.Col span={{ sm: 12 }}>
          <Group align="center">
            <Text c="dimmed" size="sm">
              These may be out of date...
            </Text>
            <ActionIcon onClick={triggerCompute} variant="light" size="sm">
              {computing ? <Loader size="xs" /> : <ArrowsClockwiseIcon />}
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
              <Stack>
                <Group align="center">
                  <Text size="sm">Ideas you've connected...</Text>
                  {loadingIdea && <Loader size="xs" color="gray" />}
                </Group>
                <Group>
                  <ActionIcon
                    variant="light"
                    size={"sm"}
                    onClick={() => newConnectedIdea(idea.id.toString())}
                  >
                    <NotePencilIcon size={14} />
                  </ActionIcon>
                  {!loadingIdea && (
                    <HoverCard width="400px">
                      <HoverCard.Target>
                        <ActionIcon variant="subtle" size="sm" color="gray">
                          <InfoIcon />
                        </ActionIcon>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Text size="sm" mb="xs">
                          Explicit connections between ideas are only made by
                          you, and they are persistent even if the content
                          changes, unlike similar ideas. You can drag and drop
                          ideas to this area, or click the associated buttons to
                          make connections.
                        </Text>
                        <Text c="dimmed" size="xs">
                          Click the <NotePencilIcon /> button to create a new
                          connected note.
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  )}
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                {connections && connections?.length > 0 ? (
                  connections?.map((connection, i) => {
                    return (
                      <IdeaCard
                        key={connection.id.toString()}
                        idea={connection}
                        actions={[
                          {
                            id: "remove_connection",
                            label: "Remove",
                            icon: <TrashSimpleIcon />,
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
                  <Text c="dimmed" size="xs">
                    No connections yet. Try connecting a related idea!
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
            {related && related?.length > 0 ? (
              <Accordion
                variant="filled"
                styles={{
                  content: {
                    padding: "0px",
                  },
                }}
              >
                {related?.map((relatedIdea) => {
                  const distance = relatedIdea.distance;
                  const level = similarityToLevel(distance);
                  const color = similarityToColor[level];
                  const isConnected = ideaIsConnected(
                    relatedIdea.id.toString(),
                  );

                  return (
                    <Accordion.Item
                      value={relatedIdea.id.toString()}
                      key={relatedIdea.id.toString()}
                    >
                      <Accordion.Control p={0}>
                        <Group mr="xs" p={0}>
                          <IdeaButton
                            key={relatedIdea.id.toString()}
                            idea={relatedIdea}
                            fullWidth
                          />
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          <Group gap="xs" align="center">
                            <Group gap="xs" align="center">
                              {!isConnected && (
                                <ActionIcon
                                  variant="light"
                                  size="sm"
                                  color={"dark.3"}
                                  onClick={() => {
                                    console.log("Hitting on click!");
                                    createIdeaConnection(
                                      idea.id.toString(),
                                      relatedIdea.id.toString(),
                                    ).then(() => {
                                      reloadIdea();
                                    });
                                  }}
                                  title="Connect this idea"
                                >
                                  <GraphIcon size={14} weight="bold" />
                                </ActionIcon>
                              )}
                              <ActionIcon
                                variant="light"
                                size="sm"
                                onClick={() => {
                                  navigate(
                                    `/idea/${relatedIdea.id.toString()}`,
                                  );
                                }}
                                title="View related idea"
                              >
                                <ArrowRightIcon size={14} weight="bold" />
                              </ActionIcon>
                            </Group>
                            <Badge color={color} variant="light" size="xs">
                              {level}
                            </Badge>
                          </Group>
                          <Text size="sm">
                            {
                              relatedIdea.derived?.generative_summary
                                ?.sentenceOverview
                            }
                          </Text>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            ) : (
              <Text size="xs" c="dimmed">
                No related ideas yet.
              </Text>
            )}
          </Grid.Col>
        </Grid>
      </Grid.Col>
    </Grid>
  );
}
