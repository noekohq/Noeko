import { Group, Stack, Text } from "@mantine/core";
import { UsersThreeIcon, XIcon } from "@phosphor-icons/react";
import PaperChip from "@core/design/components/Paper/PaperChip";

type SharedModeControlProps = {
  active: boolean;
  onChange: (active: boolean) => void;
};

export function SharedModeControl({ active, onChange }: SharedModeControlProps) {
  return (
    <Stack gap="xs">
      <div>
        <Text size="xs" fw={650}>
          Shared landscape
        </Text>
        <Text size="xs" c="dimmed">
          Include knowledge shared with you and people connected through sharing.
        </Text>
      </div>
      <Group gap="xs">
        <PaperChip active={active} size="compact" onClick={() => onChange(!active)}>
          {!active && <UsersThreeIcon aria-hidden size={14} weight="bold" />}
          <span>{active ? "Shared" : "Include shared"}</span>
          {active && <XIcon aria-hidden size={12} weight="bold" />}
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            {active ? "Remove Shared filter" : "Add Shared filter"}
          </span>
        </PaperChip>
      </Group>
    </Stack>
  );
}
