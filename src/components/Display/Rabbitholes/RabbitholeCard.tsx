import { ActionIcon, Group, MantineColor, Menu, Text } from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { formatDateTime } from "../../../utils/formatting";
import { useNavigate } from "react-router";
import { IconProps } from "../../Utils/Icons/Icon";
import styles from "./RabbitholeCard.module.scss";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";
import { IRabbitholeAction } from "./rabbitholes";

interface IRabbitholeCardProps {
  rabbithole: IRabbithole;
  description?: string;
  onClick?: (rabbithole: IRabbithole) => void;
  actions?: IRabbitholeAction[];
}

const getRabbitholeDefaultSummary = (
  rabbithole: IRabbithole,
): string | undefined => {
  return `Updated ${formatDateTime(rabbithole.updatedAt)}`;
};

export default function RabbitholeCard({
  rabbithole,
  description,
  onClick,
  actions,
}: IRabbitholeCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(rabbithole);
    } else {
      navigate(`/rabbitholes/${rabbithole.id.toString()}`);
    }
  };

  const desc = description || getRabbitholeDefaultSummary(rabbithole);

  return (
    <div
      role="button"
      onClick={() => {
        handleClick();
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleClick();
        }
      }}
      className={styles.rabbitholeCard}
    >
      <Group justify="space-between">
        <Text size="sm" fw="bold">
          <Group gap="xs" wrap="nowrap">
            <RabbitholeIcon size={16} />
            {rabbithole.name}
          </Group>
        </Text>
        <Group>
          {!!actions?.length && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  size="md"
                  variant="subtle"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <DotsThreeVerticalIcon />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {actions?.map((action) => {
                  return (
                    <Menu.Item
                      key={action.id}
                      leftSection={action.icon}
                      onClick={(e) => {
                        action.onClick(e, rabbithole);
                      }}
                      color={action.color}
                    >
                      {action.label}
                    </Menu.Item>
                  );
                })}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
      <Group>
        <Text size="sm">{desc}</Text>
      </Group>
    </div>
  );
}
