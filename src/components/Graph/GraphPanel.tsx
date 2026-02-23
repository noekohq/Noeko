import { forwardRef, useMemo } from "react";
import styles from "./GraphPanel.module.scss";
import { Button, Group, Stack, Text } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import { useGraph } from '@/contexts/GraphContext';
import { showNotification } from "@mantine/notifications";
import { includeThingsInRabbithole, newRabbithole } from '@/utils/rabbitholes';
import { useNavigate } from "react-router";
import { createPortal } from "react-dom";

interface IGraphPanelProps {
  position: { x: number; y: number };
  onClose: () => void;
}

export const GraphPanel = forwardRef<HTMLDivElement, IGraphPanelProps>(
  ({ position, onClose }, ref) => {
    const {
      selected: { get: selected },
    } = useGraph();

    const navigate = useNavigate();

    const selectedArray = Array.from(selected.entries());
    const includable = useMemo(() => {
      return selectedArray
        .map(([thing]) => thing)
        .filter((thing) => {
          return (
            thing.toString().startsWith("tag") ||
            thing.toString().startsWith("idea") ||
            thing.toString().startsWith("task") ||
            thing.toString().startsWith("excerpt") ||
            thing.toString().startsWith("source")
          );
        });
    }, [selectedArray]);

    const handleCreateRabbithole = async () => {
      try {
        const rabbithole = await newRabbithole();
        if (!rabbithole) {
          throw new Error("Couldn't get rabbithole");
        }
        await includeThingsInRabbithole(rabbithole.id.toString(), includable);
        navigate(`/rabbitholes/${rabbithole.id.toString()}`);
      } catch (error) {
        console.error("Error creating rabbithole with selection: ", error, selected);
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong creating the rabbithole",
        });
        return undefined;
      }
    };

    return createPortal(
      <div
        className={styles.graphPanel}
        ref={ref}
        style={{
          left: position.x + 4,
          top: position.y + 16,
          zIndex: 10,
          transform: `translateX(-50%)`,
        }}
      >
        <Stack>
          <Text fw="bold" c="dimmed" size="sm">
            <Group gap="xs" align="center">
              NEW
              <PlusIcon weight="bold" size={14} />
            </Group>
          </Text>
          <Button
            fullWidth
            color="gray"
            variant="light"
            onClick={() => {
              handleCreateRabbithole();
            }}
          >
            Rabbithole with {includable.length} things
          </Button>
        </Stack>
      </div>,
      document.body
    );
  }
);
