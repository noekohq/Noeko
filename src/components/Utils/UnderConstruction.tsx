import { Group, Paper, Text } from "@mantine/core";
import { HammerIcon } from "@phosphor-icons/react";

export default function UnderConstruction() {
  return (
    <Paper radius="lg" p="md">
      <Text size="sm" fw="bold">
        <Group>
          <HammerIcon weight="bold" />
          This page is under construction.
        </Group>
      </Text>
    </Paper>
  );
}
