import { Card, Group, Stack, Text } from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { formatDateTime } from "../../../utils/formatting";
import { RabbitIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

interface IRabbitholeCardProps {
  rabbithole: IRabbithole;
  onCardClick?: () => void;
  navigateOnCardClick?: boolean;
}

export default function RabbitholeCard({
  rabbithole,
  onCardClick,
  navigateOnCardClick,
}: IRabbitholeCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    onCardClick?.();
    if (navigateOnCardClick) {
      navigate(`/rabbitholes/${rabbithole.id}`);
    }
  };

  return (
    <Card
      withBorder
      radius="lg"
      onClick={handleCardClick}
      shadow="lg"
      style={{
        cursor: "pointer",
      }}
    >
      <Stack gap="xs">
        <Group>
          <RabbitIcon />
          <Text fw={500} c="dimmed" size="sm">
            {rabbithole.name}
          </Text>
        </Group>
        <Text size="sm">{formatDateTime(rabbithole.createdAt)}</Text>
      </Stack>
    </Card>
  );
}
