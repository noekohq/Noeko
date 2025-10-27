import { ActionIcon, Group, List, Stack, Text } from "@mantine/core";
import styles from "./Feedback.module.scss";
import { IOnboardingProps } from "./Index";
import { MegaphoneIcon } from "@phosphor-icons/react";
import { useInteraction } from "../../../contexts/InteractionContext";

export default function Feedback({ next }: IOnboardingProps) {
  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <div className={styles.feedback}>
      <h2>One last thing!</h2>
      <Stack ta="left" className={styles.body}>
        <Text size="md">Our mission at Noeko is to:</Text>
        <List type="ordered" size="md">
          <List.Item>
            Make knowledge-management a frictionless process
          </List.Item>
          <List.Item>Help you get the most out of their thoughts</List.Item>
        </List>
        <div className={styles.card}>
          <Group wrap="nowrap" mb="sm">
            <ActionIcon
              variant="light"
              color="gray"
              size="md"
              radius="md"
              onClick={() => {
                openFeedbackModal();
              }}
            >
              <MegaphoneIcon size={16} />
            </ActionIcon>
            <Text>
              Wherever you see this icon, you can give us feedback to help us
              improve.
            </Text>
          </Group>
          <Text size="xs" c="dimmed" fs="italic">
            Pro tip: try it now!
          </Text>
        </div>
      </Stack>
      <Group justify="center">
        <button className={styles.button} onClick={next}>
          Sounds good, next!
        </button>
      </Group>
    </div>
  );
}
