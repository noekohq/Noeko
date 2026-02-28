import { Badge, Group, Stack, Text } from "@mantine/core";
import styles from "./FeedbackCard.module.scss";
import { formatDate } from "@core/utils/formatting";
import { formatDateTime } from "@core/utils/formatting";
import { IFeedback } from "../../../../../../shared/types/feedback";

interface IFeedbackCardProps {
  feedback: IFeedback;
  onClick?: (feedback: IFeedback) => void;
}

export default function FeedbackCard({ feedback, onClick }: IFeedbackCardProps) {
  const clipContent = (content: string) => {
    if (content.length > 56) {
      return content.slice(0, 56) + "...";
    }
    return content;
  };

  return (
    <button
      className={styles.feedbackCard}
      onClick={() => {
        onClick?.(feedback);
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw="bold">
          {clipContent(feedback.content)}
        </Text>
        <Text size="sm" c="dark.3">
          {feedback.user?.firstName} {feedback.user?.lastName} - {formatDate(feedback.createdAt)}
        </Text>
        <Group gap="xs">
          {!(feedback.status === "addressed") && (
            <Badge size="xs" color="blue" variant="light">
              OPEN
            </Badge>
          )}
        </Group>
      </Stack>
    </button>
  );
}
