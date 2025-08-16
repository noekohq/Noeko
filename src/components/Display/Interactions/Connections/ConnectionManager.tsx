import { useEffect, useState } from "react";
import { IConnectable } from "../../../../../app/services/Graph";
import useFetch from "../../../../hooks/useFetch";
import styles from "./ConnectionManager.module.scss";
import useConnectable from "../../../../hooks/useConnectable";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Group,
  HoverCard,
  Loader,
  Overlay,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  ArrowsClockwiseIcon,
  InfoIcon,
  IntersectSquareIcon,
  NotePencilIcon,
  UniteSquareIcon,
} from "@phosphor-icons/react";
import { useInteraction } from "../../../../contexts/InteractionContext";
import ConnectableThing from "./ConnectionThing";
import { similarityToColor, similarityToLevel } from "../../../../vars/ideas";
import { getNodeDescription } from "../../../../utils/graph";

interface IConnectionManagerProps {
  connectable: IConnectable;
  onReload?: () => void;
  shouldUpdate?: boolean;
}

export default function ConnectionManager({
  connectable,
  onReload,
  shouldUpdate,
}: IConnectionManagerProps) {
  const {
    connected,
    loadingConnected,
    similar,
    loadingSimilar,
    connect,
    disconnect,
    reload,
    isConnected,
  } = useConnectable({ connectable });

  useEffect(() => {
    if (shouldUpdate) {
      reload();
    }
  }, [shouldUpdate]);

  const [draggingOverConnectionDrop, setDraggingOverConnectionDrop] =
    useState(false);
  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData);
      const thingId =
        data.thingId || data.ideaId || data.taskId || data.sourceId;
      if (isConnected(thingId)) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this thing again.",
          color: "yellow",
        });
        return;
      }
      console.log("Dropped connection id: ", thingId);
      await connect(thingId);
    } catch (error) {
      console.log("Error creating connection: ", error);
    } finally {
      setDraggingOverConnectionDrop(false);
    }
  };

  const {
    actions: { newConnectedIdea },
  } = useInteraction();

  return (
    <div className={styles.connectionManager}>
      <Box
        onDragOver={() => {
          setDraggingOverConnectionDrop(true);
        }}
        onDragLeave={() => {
          setDraggingOverConnectionDrop(false);
        }}
        pos="relative"
      >
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
            mih={"300px"}
          >
            <Group align="center" justify="center" style={{ height: "100%" }}>
              <Text c="white" mx="lg" size="sm">
                Drop here to create a connection
              </Text>
            </Group>
          </Overlay>
        )}
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
                onClick={() => newConnectedIdea(connectable.id.toString())}
              >
                <NotePencilIcon size={14} />
              </ActionIcon>
              <HoverCard width="400px" openDelay={300}>
                <HoverCard.Target>
                  <ActionIcon variant="subtle" size="sm" color="gray">
                    <InfoIcon />
                  </ActionIcon>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Text size="sm" mb="xs">
                    Explicit connections between ideas are only made by you, and
                    they are persistent even if the content changes, unlike
                    similar ideas. You can drag and drop ideas to this area, or
                    click the associated buttons to make connections.
                  </Text>
                  <Text c="dimmed" size="xs" mb="xs">
                    Click the <NotePencilIcon /> button to create a new
                    connected note.
                  </Text>
                  {connected && connected?.length <= 0 && (
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
        <Group>
          {connected &&
            connected?.length > 0 &&
            connected?.map((connection, i) => {
              return (
                <ConnectableThing
                  key={connection.id.toString()}
                  connectable={connectable}
                  thing={connection}
                />
              );
            })}
        </Group>
      </Box>
      <Group justify="space-between">
        <Text size="sm" c="dimmed" fw="bold">
          <Group gap="xs">
            <IntersectSquareIcon weight="bold" />
            RELATED
          </Group>
        </Text>
        <Group>
          <Transition mounted={loadingSimilar} transition="fade-up">
            {(styles) => {
              return (
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="sm"
                  style={styles}
                >
                  {loadingSimilar ? (
                    <Loader size="xs" />
                  ) : (
                    <ArrowsClockwiseIcon size={14} />
                  )}
                </ActionIcon>
              );
            }}
          </Transition>
        </Group>
      </Group>
      <Transition
        mounted={!!similar && similar?.length > 0}
        transition="fade-up"
      >
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
              {similar?.map((similar) => {
                const distance =
                  (similar as IConnectable & { distance: number }).distance ||
                  0;
                const level = similarityToLevel(distance);
                const color = similarityToColor[level];
                const connected = isConnected(similar.id.toString());

                return (
                  <Accordion.Item
                    value={similar.id.toString()}
                    key={similar.id.toString()}
                  >
                    <Accordion.Control p={0}>
                      <Group mr="xs" p={0}>
                        <ConnectableThing
                          key={similar.id.toString()}
                          connectable={connectable}
                          thing={similar}
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
                                  connect(similar.id.toString());
                                }}
                                title="Connect this idea"
                              >
                                <UniteSquareIcon size={14} weight="bold" />
                              </ActionIcon>
                            )}
                          </Group>
                          <Badge color={color} variant="light" size="xs">
                            {level}
                          </Badge>
                        </Group>
                        <Text size="sm">{getNodeDescription(similar)}</Text>
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
        mounted={
          !similar || (similar && similar.length <= 0 && !loadingSimilar)
        }
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
      <Transition mounted={loadingSimilar} transition="fade-up">
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
    </div>
  );
}
