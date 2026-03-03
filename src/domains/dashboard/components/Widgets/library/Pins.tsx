import styles from "./Pins.module.scss";
import { IWidgetConfig } from "../index.d";
import usePins from "@domains/knowledge/hooks/usePins";
import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import ConnectableThing from "@core/design/components/Display/Interactions/Connections/ConnectableThing";
import { ArrowRightIcon, PushPinIcon } from "@phosphor-icons/react";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "@core/design/components/Paper/Things/thingUtils";
import { Link } from "react-router";

export default function Pins() {
  const { pins, pinThing, unpinThing } = usePins();

  const firstN = pins.slice(0, 6);

  return (
    <div className={styles.pins}>
      <Stack>
        <Group justify="space-between">
          <Text size="sm" fw="bold" c="dimmed">
            <Group gap="4px">
              <PushPinIcon weight="bold" />
              RECENT PINS
            </Group>
          </Text>
          <Link
            to="/pinned"
            style={{
              textDecoration: "none",
            }}
          >
            <Text size="sm" c="dark.4">
              <Group align="center" gap="4px">
                All
                <ArrowRightIcon />
              </Group>
            </Text>
          </Link>
        </Group>
        {pins.length <= 0 && (
          <Text size="sm" c="dimmed">
            No pins.
          </Text>
        )}
        {firstN.length > 0 && (
          <SimpleGrid
            cols={{
              sm: 1,
              md: 2,
            }}
          >
            {firstN.map((pin) => {
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
