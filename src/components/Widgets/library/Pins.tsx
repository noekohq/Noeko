import styles from "./Pins.module.scss";
import { IWidgetConfig } from "../index.d";
import usePins from '@/hooks/usePins';
import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import ConnectableThing from '@/components/Display/Interactions/Connections/ConnectableThing';
import { PushPinIcon } from "@phosphor-icons/react";
import PaperThing from '@core/design/components/Paper/Things/PaperThing';
import { getThingPropsFromConnectable } from '@core/design/components/Paper/Things/thingUtils';

export default function Pins() {
  const { pins, pinThing, unpinThing } = usePins();

  return (
    <div className={styles.pins}>
      <Stack>
        <Text size="sm" fw="bold" c="dimmed">
          <Group gap="4px">
            <PushPinIcon weight="bold" />
            YOUR PINS
          </Group>
        </Text>
        {pins.length <= 0 && (
          <Text size="sm" c="dimmed">
            No pins.
          </Text>
        )}
        {pins.length > 0 && (
          <SimpleGrid
            cols={{
              sm: 1,
              md: 2,
            }}
          >
            {pins.map((pin) => {
              const props = getThingPropsFromConnectable(pin, {}, true);
              return (
                <div key={pin.id.toString()}>
                  <PaperThing {...props} />
                </div>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 12,
    min: 6,
    max: 12,
  },
};
