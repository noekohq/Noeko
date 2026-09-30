import { ActionIcon, Box, Menu, Text, Tooltip } from "@mantine/core";
import { CheckIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { IConstellationVisualMode } from "./visualModes";
import styles from "./ConstellationVisualModeMenu.module.scss";

type IConstellationVisualModeMenuProps = {
  value: IConstellationVisualMode;
  onChange: (mode: IConstellationVisualMode) => void;
  position?: "bottom-start" | "right-start";
};

const modes: Array<{
  value: IConstellationVisualMode;
  label: string;
  description: string;
}> = [
  {
    value: "depth",
    label: "Depth (default)",
    description: "Directional highlights with distance-based edge and node depth.",
  },
  {
    value: "classic",
    label: "Classic",
    description: "Uniform nodes and gentle fades without directional waves.",
  },
  {
    value: "static",
    label: "Static",
    description: "Immediate visual updates with no graph effect animations.",
  },
];

export default function ConstellationVisualModeMenu({
  value,
  onChange,
  position = "bottom-start",
}: IConstellationVisualModeMenuProps) {
  const [opened, setOpened] = useState(false);

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      position={position}
      width={280}
      radius="md"
      withArrow
      shadow="md"
    >
      <Menu.Target>
        <Tooltip
          label="Constellation visuals"
          position={position === "right-start" ? "right" : "bottom"}
          disabled={opened}
        >
          <ActionIcon
            className={styles.trigger}
            variant="subtle"
            size="md"
            aria-label="Constellation visual options"
            aria-pressed={opened}
            data-expanded={opened}
          >
            <SlidersHorizontalIcon size={16} weight="bold" />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Visual mode</Menu.Label>
        {modes.map((mode) => (
          <Menu.Item
            key={mode.value}
            onClick={() => onChange(mode.value)}
            rightSection={value === mode.value ? <CheckIcon size={14} weight="bold" /> : null}
          >
            <Box className={styles.modeLabel}>
              <Text size="sm" fw={600}>
                {mode.label}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={2}>
                {mode.description}
              </Text>
            </Box>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
