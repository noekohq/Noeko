import { Box, Group, Kbd, Text } from "@mantine/core";
import React from "react";

interface IShortcutProps {
  keys: string[];
  description: string;
}

export default function Shortcut({ keys, description }: IShortcutProps) {
  return (
    <Group gap={"sm"} p={10}>
      <Group gap="xs">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <Kbd key={index} size={16}>
              {key}
            </Kbd>
            {index !== keys.length - 1 && (
              <Box fz={16} fw={500}>
                +
              </Box>
            )}
          </React.Fragment>
        ))}
      </Group>
      <Text size="md" fw="500">
        {description}
      </Text>
    </Group>
  );
}
