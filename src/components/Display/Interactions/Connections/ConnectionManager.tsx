import { useEffect, useState, useMemo } from "react";
import { IConnectable } from "../../../../../app/services/Graph";
import styles from "./ConnectionManager.module.scss";
import useConnectable from "../../../../hooks/useConnectable";
import {
  Box,
  Group,
  Overlay,
  Stack,
  Text,
  Transition,
  ActionIcon,
  Tooltip,
  Divider,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { NotePencilIcon, PlusIcon, SubtractIcon } from "@phosphor-icons/react";
import { useInteraction } from "../../../../contexts/InteractionContext";
import { useTourStep } from "../../../../contexts/TourGuideContext";
import PaperThing from "../../Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../../Paper/Things/thingUtils";
import { similarityToLevel } from "../../../../vars/ideas";
import { ConnectionPicker } from "./ConnectionPicker";
import { capitalize } from "../../../../utils/formatting";

interface IConnectionManagerProps {
  connectable: IConnectable;
  maxSuggested?: number;
  shouldUpdate?: boolean;
}

export default function ConnectionManager({
  connectable,
  maxSuggested = 3,
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

  const {
    actions: { newConnectedIdea },
  } = useInteraction();

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (shouldUpdate) {
      load();
    }
  }, [shouldUpdate]);

  // --- Logic: Filtering & Slicing ---

  // 1. Identify what is already connected (to omit from suggestions/picker)
  const connectedIdSet = useMemo(() => {
    return new Set(connected?.map((c) => c.id.toString()) || []);
  }, [connected]);

  // 2. Filter similar items that are NOT connected
  const filteredSimilar = useMemo(() => {
    if (!similar) return [];
    return similar.filter((s) => !connectedIdSet.has(s.id.toString()));
  }, [similar, connectedIdSet]);

  // 3. Slice for display
  const suggestionsToShow = filteredSimilar.slice(0, maxSuggested);

  // --- Logic: Drag & Drop ---
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
          <Transition mounted={hasConnections} transition="fade" duration={200}>
            {(styles) => (
              <div style={styles}>
                <Stack gap="xs">
                  {connected?.map((thing) => (
                    <PaperThing
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
                        true,
                      )}
                    />
                  ))}
                </Stack>
              </div>
            )}
          </Transition>

          <Transition mounted={hasSuggestions} transition="fade" duration={200}>
            {(styles) => (
              <div style={styles}>
                <Stack gap="xs">
                  {suggestionsToShow.map((thing) => {
                    // Example: Add similarity info to the detail
                    const distance = (thing as any).distance || 0;
                    const level = similarityToLevel(distance);
                    const baseDetail =
                      getThingPropsFromConnectable(thing).detail;

                    return (
                      <PaperThing
                        key={thing.id.toString()}
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
                          true,
                        )}
                      />
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
            omitIds={omitIds}
          />
        </Stack>
      </Box>
    </div>
  );
}
