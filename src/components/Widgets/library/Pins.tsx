import styles from "./Pins.module.scss";
import { IWidgetConfig } from "../index.d";
import usePins from "../../../hooks/usePins";
import { Stack, Text } from "@mantine/core";

export default function Pins() {
  const { pins, pinThing, unpinThing } = usePins();

  console.log("pins: ", pinThing, unpinThing);

  return (
    <div className={styles.pins}>
      <Stack>
        <Text size="sm" fw="bold" c="dimmed">
          YOUR PINS
        </Text>
        {pins.length <= 0 && (
          <Text size="sm" c="dimmed">
            No pins.
          </Text>
        )}
      </Stack>
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 7,
    min: 6,
    max: 12,
  },
};
