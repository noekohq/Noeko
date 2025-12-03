import {
  ActionIcon,
  Badge,
  Group,
  MantineColor,
  Menu,
  Text,
} from "@mantine/core";
import { ITag } from "../../../../app/database/models/tag";
import { useNavigate } from "react-router";
import { IconProps } from "../../Utils/Icons/Icon";
import styles from "./TagCard.module.scss";
import { DotsThreeVerticalIcon, TagIcon } from "@phosphor-icons/react";

export type ITagAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, tag: ITag) => void;
  color?: MantineColor;
  variant?:
    | "filled"
    | "light"
    | "outline"
    | "default"
    | "subtle"
    | "transparent"
    | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
};

interface ITagCardProps {
  tag: ITag;
  description?: string;
  titleIcon?: React.ReactNode;
  onClick?: (tag: ITag) => void;
  actions?: ITagAction[];
}

const getTagDefaultSummary = (tag: ITag): string | undefined => {
  return tag.description;
};

export default function TagCard({
  tag,
  description,
  onClick,
  titleIcon,
  actions,
}: ITagCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(tag);
    } else {
      navigate(`/tags/${tag.id.toString()}`);
    }
  };

  const desc = description || getTagDefaultSummary(tag);

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
      className={styles.tagCard}
    >
      <Group justify="space-between">
        <Group gap="xs">
          <Badge
            size="lg"
            c="dark.8"
            bg="dark.3"
            leftSection={<TagIcon weight="bold" />}
          >
            {tag.name}
          </Badge>
        </Group>
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
                        action.onClick(e, tag);
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
