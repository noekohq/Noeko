import { useCallback, useState } from "react";
import { IRabbithole } from '../../../../../app/database/models/rabbithole';
import styles from "./RabbitholeDropzone.module.scss";
import { showNotification } from "@mantine/notifications";
import { includeThingInRabbithole } from '@domains/rabbitholes/utils/rabbitholes';
import { Group, Overlay, Text } from "@mantine/core";

interface IRabbitholeDropzoneProps {
  rabbithole: IRabbithole;
  children: React.ReactNode;
}

export function RabbitholeDropzone({ rabbithole, children }: IRabbitholeDropzoneProps) {
  const [draggingOver, setDraggingOver] = useState(false);

  const isIncluded = (thingId: string) => {
    return !!rabbithole?.includes?.find((i) => i.id.toString() === thingId);
  };

  const handleConnectionDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      try {
        if (!rabbithole) {
          return;
        }
        const jData = e.dataTransfer.getData("application/json");
        const data = JSON.parse(jData) as { thingId: string };
        const { thingId } = data;
        if (isIncluded(thingId)) {
          showNotification({
            title: "Can't connect again",
            message: "Can't connect this idea again.",
            color: "yellow",
          });
          return;
        }
        await includeThingInRabbithole(rabbithole.id.toString(), thingId.toString());
      } catch (error) {
        console.error("Error creating connection: ", error);
      } finally {
        setDraggingOver(false);
      }
    },
    [rabbithole]
  );
  return (
    <div
      className={styles.rabbitholeDropzone}
      onDragOver={() => {
        setDraggingOver(true);
      }}
      onDragLeave={(e) => {
        setDraggingOver(false);
      }}
    >
      {draggingOver && (
        <Overlay
          backgroundOpacity={0}
          blur={4}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            handleConnectionDrop(e);
            setDraggingOver(false);
          }}
          radius={"lg"}
        >
          <Group align="center" justify="center" style={{ height: "100%" }}>
            <Text c="white" mx="lg" size="sm">
              Drop here to include something.
            </Text>
          </Group>
        </Overlay>
      )}
      {children}
    </div>
  );
}
