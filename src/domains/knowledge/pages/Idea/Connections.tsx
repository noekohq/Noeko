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
  Transition,
} from "@mantine/core";
import { IIdea, IIdeaAsRelation, IIdeaConnection, ISafeIdea } from '../../../../../shared/types/idea';
import { Link, useNavigate } from "react-router";
import IdeaPreview from '@domains/knowledge/components/Ideas/IdeaPreview';
import { useEffect, useState } from "react";
import useFetch from '@core/hooks/useFetch';
import { showNotification } from "@mantine/notifications";
import {
  ArrowRight,
  ArrowRightIcon,
  ArrowsClockwise,
  ArrowsClockwiseIcon,
  Graph,
  GraphIcon,
  InfoIcon,
  IntersectSquareIcon,
  NotePencilIcon,
  TrashSimple,
  TrashSimpleIcon,
  UniteSquareIcon,
} from "@phosphor-icons/react";
import { api } from '@infrastructure/api/client';
import { similarityToColor, similarityToLevel } from '@domains/knowledge/utils/ideas_vars';

import { createIdeaConnection, removeIdeaConnection } from '@domains/knowledge/utils/ideas';
import IdeaButton from '@domains/knowledge/components/Ideas/Interactions/IdeaButton';
import { useInteraction } from '@/contexts/InteractionContext';
import IdeaCard from '@domains/knowledge/components/Ideas/Interactions/IdeaCard';

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
  const {
    load: loadConnections,
    data: connections,
    loading: loadingConnections,
  } = useFetch<undefined, ISafeIdea[]>({
    url: `/ideas/${idea.id.toString()}/connections`,
  });
  const {
    load: loadRelated,
    data: related,
    loading: loadingRelated,
  } = useFetch<undefined, IIdeaAsRelation[]>({
    url: `/ideas/${idea.id.toString()}/related`,
  });

  useEffect(() => {
    loadConnections();
    loadRelated();
  }, [idea.id.toString(), idea.embeddingsUpdatedAt]);

  const handleReload = async () => {
    await loadConnections();
    await loadRelated();
    reloadIdea();
  };

  const ideaIsConnected = (ideaId: string) => {
    if (!idea) {
      console.error("Not testing connection on unconnected idea");
      return false;
    }
    return connections?.find((connection) => connection.id.toString() === ideaId);
  };

  const [draggingRelatedIdea, setDraggingRelatedIdea] = useState(false);
  const [draggingOverConnectionDrop, setDraggingOverConnectionDrop] = useState(false);

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
      console.info("Dropped connection id: ", ideaId);
      await createIdeaConnection(idea.id.toString(), ideaId);
      handleReload();
    } catch (error) {
      console.info("Error creating connection: ", error);
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
                <Group align="center" justify="center" style={{ height: "100%" }}>
                  <Text c="white" mx="lg" size="sm">
                    Drop here to create a connection
                  </Text>
                </Group>
              </Overlay>
            )}
            <Grid.Col>
              {draggingRelatedIdea && <Text size="sm">Drag idea here to create a connection</Text>}
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Stack>
                <Group align="center" justify="space-between">
                  <Text size="sm" c="dimmed" fw="bold">
                    <Group gap="xs">
                      <UniteSquareIcon weight="bold" />
                      CONNECTED
                    </Group>
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="gray"
                      size={"sm"}
                      onClick={() => newConnectedIdea(idea.id.toString())}
                    >
                      <NotePencilIcon size={14} />
                    </ActionIcon>
                    <HoverCard width="400px">
                      <HoverCard.Target>
                        <ActionIcon variant="subtle" size="sm" color="gray">
                          <InfoIcon />
                        </ActionIcon>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Text size="sm" mb="xs">
                          Explicit connections between ideas are only made by you, and they are
                          persistent even if the content changes, unlike similar ideas. You can drag
                          and drop ideas to this area, or click the associated buttons to make
                          connections.
                        </Text>
                        <Text c="dimmed" size="xs" mb="xs">
                          Click the <NotePencilIcon /> button to create a new connected note.
                        </Text>
                        {connections && connections?.length <= 0 && (
                          <Text c="dimmed" size="xs">
                            No connections yet. Try connecting (
                            <UniteSquareIcon size={12} />) a related idea!
                          </Text>
                        )}
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </Group>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                {connections &&
                  connections?.length > 0 &&
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
                  })}
              </Group>
            </Grid.Col>
          </Grid>
        </Box>
      </Grid.Col>
      <Grid.Col span={{ sm: 12 }} />
      <Grid.Col span={{ sm: 12 }}>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed" fw="bold">
                <Group gap="xs">
                  <IntersectSquareIcon weight="bold" />
                  RELATED
                </Group>
              </Text>
              <Group>
                <Transition mounted={computeOutOfDate} transition="fade-up">
                  {(styles) => {
                    return (
                      <ActionIcon variant="light" color="gray" size="sm" style={styles}>
                        {computing ? <Loader size="xs" /> : <ArrowsClockwiseIcon size={14} />}
                      </ActionIcon>
                    );
                  }}
                </Transition>
              </Group>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Transition mounted={!!related && related?.length > 0} transition="fade-up">
              {(styles) => {
                return (
                  <Accordion
                    variant="filled"
                    style={styles}
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
                      const isConnected = ideaIsConnected(relatedIdea.id.toString());

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
                                        console.info("Hitting on click!");
                                        createIdeaConnection(
                                          idea.id.toString(),
                                          relatedIdea.id.toString()
                                        ).then(() => {
                                          handleReload();
                                        });
                                      }}
                                      title="Connect this idea"
                                    >
                                      <UniteSquareIcon size={14} weight="bold" />
                                    </ActionIcon>
                                  )}
                                  <ActionIcon
                                    variant="light"
                                    size="sm"
                                    color="dark.3"
                                    onClick={() => {
                                      navigate(`/idea/${relatedIdea.id.toString()}`);
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
                                {relatedIdea.derived?.generative_summary?.sentenceOverview}
                              </Text>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                );
              }}
            </Transition>
            <Transition
              mounted={!related || (related && related.length <= 0 && !loadingRelated)}
              transition="fade-up"
            >
              {(styles) => {
                return (
                  <Text style={styles} size="xs" c="dimmed" mb="md">
                    No related ideas yet.
                  </Text>
                );
              }}
            </Transition>
            <Transition mounted={loadingRelated} transition="fade-up">
              {(styles) => {
                return (
                  <Group style={styles} mt="md">
                    <Loader size="xs" color="gray" />
                    <Text size="xs" c="dimmed">
                      Finding similar ideas...
                    </Text>
                  </Group>
                );
              }}
            </Transition>
          </Grid.Col>
        </Grid>
      </Grid.Col>
    </Grid>
  );
}
