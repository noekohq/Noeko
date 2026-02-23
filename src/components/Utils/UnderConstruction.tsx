import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import { HammerIcon, MegaphoneIcon } from "@phosphor-icons/react";
import { useInteraction } from '@/contexts/InteractionContext';

interface IUnderConstructionProps {
  text?: string;
  omitFeedback?: boolean;
  withBorder?: boolean;
}

export default function UnderConstruction({
  text = "This page is under construction.",
  omitFeedback = false,
  withBorder = false,
}: IUnderConstructionProps) {
  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <Paper withBorder={withBorder} radius="lg" p="md">
      <Group wrap="nowrap" justify="space-between">
        <Text size="sm" fw="bold">
          <Group>
            <HammerIcon weight="bold" />
            {text}
          </Group>
        </Text>
        {!omitFeedback && (
          <ActionIcon
            color="gray"
            variant="light"
            radius="md"
            size="lg"
            onClick={openFeedbackModal}
          >
            <MegaphoneIcon weight="bold" />
          </ActionIcon>
        )}
      </Group>
    </Paper>
  );
}
