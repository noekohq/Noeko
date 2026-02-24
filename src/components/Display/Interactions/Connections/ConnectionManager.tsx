import { useState, useMemo } from "react";
import { IConnectable } from "../../../../../app/services/Graph";
import styles from "./ConnectionManager.module.scss";
import useConnectable from "@domains/knowledge/hooks/useConnectable";
import { Box, Group, Overlay, Space, Stack, Text, Transition, Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { PlusIcon, SubtractIcon } from "@phosphor-icons/react";
import { useTourStep } from "@/contexts/TourGuideContext";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "@core/design/components/Paper/Things/thingUtils";
import { similarityToLevel } from "@domains/knowledge/utils/ideas_vars";
import { ConnectionPicker } from "./ConnectionPicker";
import { capitalize } from "@core/utils/formatting";

interface IConnectionManagerProps {
  connectable: IConnectable;
  maxSuggested?: number;
}

export default function ConnectionManager({
  connectable,
  maxSuggested = 3,
}: IConnectionManagerProps) {
  const { connected, similar, loadingSimilar, connect, disconnect, isConnected } = useConnectable({
    connectable,
  });

  const connectedIdSet = useMemo(() => {
    return new Set(connected?.map((c) => c.id.toString()) || []);
  }, [connected]);

  const filteredSimilar = useMemo(() => {
    if (!similar) return [];
    return similar.filter((s) => !connectedIdSet.has(s.id.toString()));
  }, [similar, connectedIdSet]);

  const suggestionsToShow = filteredSimilar.slice(0, maxSuggested);
  const otherSuggestions = filteredSimilar.slice(maxSuggested);

  const suggestionsFingerprint = useMemo(() => {
    return suggestionsToShow.map((s) => s.id).join(",");
  }, [suggestionsToShow]);

  const [draggingOver, setDraggingOver] = useState(false);

  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(false);

    try {
      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData);
      const thingId = data.thingId;

      if (!thingId) return;

      if (isConnected(thingId)) {
        showNotification({
          title: "Already connected",
          message: "These two things are already linked.",
          color: "yellow",
        });
        return;
      }
      await connect(thingId);
    } catch (error) {
      console.error("Error creating connection: ", error);
    }
  };

  const connectionRef = useTourStep({
    id: "feature:connections",
    view: "editor",
    order: 11,
    title: "Connections & Context",
    content: "Drag and drop notes here, or use the picker to find connections.",
  });

  const hasConnections = connected && connected.length > 0;
  const hasSuggestions = suggestionsToShow.length > 0;
  const omitIds = [...Array.from(connectedIdSet), connectable.id.toString()];

  return (
    <div className={styles.connectionManager} ref={connectionRef}>
      <Box
        className={styles.dropZone}
        onDragOver={(e) => {
          e.preventDefault();
          setDraggingOver(true);
        }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleConnectionDrop}
      >
        {draggingOver && (
          <Overlay
            color="dark.9"
            backgroundOpacity={0.05}
            blur={4}
            className={styles.overlay}
            radius="md"
          >
            <Group align="center" justify="center" h="100%">
              <Text fw={700} size="sm" c="dark.1">
                Drop to connect
              </Text>
            </Group>
          </Overlay>
        )}

        <Stack gap="md">
          {/* Connected Items */}
          <Transition mounted={hasConnections} transition="fade" duration={200}>
            {(styles) => (
              <div style={styles}>
                <Stack gap="xs">
                  {connected?.map((thing) => (
                    <PaperThing
                      draggable={true}
                      key={thing.id.toString()}
                      {...getThingPropsFromConnectable(
                        thing,
                        {
                          state: "default",
                          action: {
                            icon: SubtractIcon,
                            tooltip: "Disconnect",
                            onClick: (id) => disconnect(id),
                          },
                        },
                        true
                      )}
                    />
                  ))}
                </Stack>
              </div>
            )}
          </Transition>

          {/* Suggested Items */}
          <Transition mounted={hasSuggestions} transition="fade" duration={200}>
            {(transitionStyles) => (
              <div style={transitionStyles}>
                <Stack gap="xs" className={styles.suggestionsWrapper} key={suggestionsFingerprint}>
                  {suggestionsToShow.map((thing) => {
                    const distance = (thing as any).distance || 0;
                    const level = similarityToLevel(distance);
                    const baseDetail = getThingPropsFromConnectable(thing).detail;

                    return (
                      <div key={thing.id.toString()} className={styles.suggestedItemWrapper}>
                        <PaperThing
                          draggable
                          {...getThingPropsFromConnectable(
                            thing,
                            {
                              state: "suggested",
                              detail: `${capitalize(level)} Match • ${baseDetail}`,
                              action: {
                                icon: PlusIcon,
                                tooltip: "Connect",
                                onClick: (id) => connect(id),
                              },
                            },
                            true
                          )}
                        />
                      </div>
                    );
                  })}
                </Stack>
              </div>
            )}
          </Transition>

          <ConnectionPicker
            onSelect={async (id) => {
              await connect(id);
            }}
            connectableId={connectable.id.toString()}
            omitIds={omitIds}
            initialSuggestions={otherSuggestions}
          />
          <Space my="sm" />

          {/* Loading Transition driven by TanStack instead of arbitrary outofdate prop */}
          <Transition mounted={loadingSimilar} transition="slide-up">
            {(style) => {
              return (
                <Group justify="center" gap="xs" style={style}>
                  <Loader size="xs" color="gray" />
                  <Text c="dark.3" size="xs" ta="center">
                    Finding connections...
                  </Text>
                </Group>
              );
            }}
          </Transition>
        </Stack>
      </Box>
    </div>
  );
}
