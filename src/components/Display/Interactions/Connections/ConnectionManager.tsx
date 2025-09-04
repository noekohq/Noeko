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
  Button,
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
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  InfoIcon,
  IntersectSquareIcon,
  NotePencilIcon,
  SubtractSquareIcon,
  UniteSquareIcon,
} from "@phosphor-icons/react";
import { useInteraction } from "../../../../contexts/InteractionContext";
import ConnectableThing from "./ConnectableThing";
import { similarityToColor, similarityToLevel } from "../../../../vars/ideas";
import { getNodeDescription } from "../../../../utils/graph";
import CollapseButton from "../CollapseButton";
import { useNavigate } from "react-router";
import useRabbithole from "../../../../hooks/useRabbithole";
import { RabbitholeIcon } from "../../../Utils/Icons/Icons";

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
    load,
    isConnected,
  } = useConnectable({ connectable });

  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (shouldUpdate) {
      load();
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
      await connect(thingId);
    } catch (error) {
      console.error("Error creating connection: ", error);
    } finally {
      setDraggingOverConnectionDrop(false);
    }
  };

  const navigate = useNavigate();

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
            backgroundOpacity={0.5}
            blur={10}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              handleConnectionDrop(e);
            }}
            radius={"lg"}
          >
            <Group align="center" justify="center" style={{ height: "100%" }}>
              <Text c="dark.7" mx="lg" size="sm">
                Drop here to create a connection
              </Text>
            </Group>
          </Overlay>
        )}
        <Stack>
          <Group align="center" justify="space-between" mt="lg">
            <Text size="sm" c="dark.4" fw="bold">
              <Group gap="xs">
                <UniteSquareIcon weight="bold" />
                CONNECTED
                <Transition mounted={loadingConnected} transition="fade-up">
                  {(styles) => {
                    return (
                      <div style={styles}>
                        <Loader color="gray" size="xs" />
                      </div>
                    );
                  }}
                </Transition>
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
                    Explicit connections are only made by you, and they are
                    persistent even if the content changes, unlike similar
                    things. You can drag and drop ideas to this area, or click
                    the associated buttons to make connections.
                  </Text>
                  <Text c="dimmed" size="xs" mb="xs">
                    Click the <NotePencilIcon /> button to create a new
                    connected note.
                  </Text>
                  {connected && connected?.length <= 0 && (
                    <Text c="dimmed" size="xs">
                      No connections yet. Try connecting (
                      <UniteSquareIcon size={12} />) a related thing!
                    </Text>
                  )}
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
          </Group>
          <Transition
            mounted={connected && connected.length <= 0 && !loadingConnected}
            transition="fade-up"
          >
            {(styles) => {
              return (
                <Text style={styles} size="xs" c="dimmed">
                  No connected things yet.
                </Text>
              );
            }}
          </Transition>
        </Stack>
        <Stack mt="sm">
          {connected &&
            connected?.length > 0 &&
            connected?.map((connection, i) => {
              return (
                <CollapseButton
                  key={connection.id.toString()}
                  target={
                    <>
                      <ConnectableThing
                        connectable={connectable}
                        thing={connection}
                      />
                    </>
                  }
                  details={
                    <>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <Button
                            variant="light"
                            size="xs"
                            color="dark.3"
                            onClick={() => {
                              disconnect(connection.id.toString());
                            }}
                            title="Disconnect this thing"
                            leftSection={<SubtractSquareIcon weight="bold" />}
                            radius="md"
                          >
                            Disconnect
                          </Button>
                        </Group>
                        <Text size="sm">{getNodeDescription(connection)}</Text>
                      </Stack>
                    </>
                  }
                />
              );
            })}
        </Stack>
        {draggingOverConnectionDrop && <Box mih={"10vh"} />}
      </Box>
      <Stack gap="xs" mb="md" mt="md">
        <Text size="sm" c="dark.4" fw="bold">
          <Group gap="xs">
            <IntersectSquareIcon weight="bold" />
            RELATED
            <Transition mounted={loadingSimilar} transition="fade-up">
              {(styles) => {
                if (loadingSimilar) {
                  return <Loader color="gray" size="xs" />;
                }
                return (
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="xs"
                    style={styles}
                  >
                    <ArrowsClockwiseIcon size={12} />
                  </ActionIcon>
                );
              }}
            </Transition>
          </Group>
        </Text>
        {isDownRabbithole && (
          <Text size="xs" c="dimmed">
            <Group align="center" gap="xs" wrap="nowrap">
              In "{currentRabbithole?.name}"{" "}
              <RabbitholeIcon size={14} color="var(--mantine-color-gray-4)" />
            </Group>
          </Text>
        )}
      </Stack>
      <Transition
        mounted={!!similar && similar?.length > 0}
        transition="fade-up"
      >
        {(styles) => {
          return (
            <Stack gap="md">
              {similar?.map((similar) => {
                const distance =
                  (similar as IConnectable & { distance: number }).distance ||
                  0;
                const level = similarityToLevel(distance);
                const color = similarityToColor[level];
                const connected = isConnected(similar.id.toString());

                return (
                  <CollapseButton
                    key={similar.id.toString()}
                    target={
                      <ConnectableThing
                        key={similar.id.toString()}
                        connectable={connectable}
                        thing={similar}
                      />
                    }
                    details={
                      <>
                        <Stack gap="md">
                          <Group gap="xs" align="baseline">
                            {!connected && (
                              <Button
                                variant="light"
                                size="xs"
                                radius="md"
                                color={"dark.3"}
                                onClick={() => {
                                  connect(similar.id.toString());
                                }}
                                title="Connect this idea"
                                leftSection={<UniteSquareIcon weight="bold" />}
                              >
                                Connect
                              </Button>
                            )}
                            <Badge color={"gray"} variant="light" size="sm">
                              {level}
                            </Badge>
                          </Group>
                          <Text size="sm">{getNodeDescription(similar)}</Text>
                        </Stack>
                      </>
                    }
                  />
                );
              })}
            </Stack>
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
              No related things yet.
            </Text>
          );
        }}
      </Transition>
    </div>
  );
}
