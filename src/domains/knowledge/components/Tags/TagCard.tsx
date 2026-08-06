import { ActionIcon, Badge, Group, MantineColor, Menu, Text } from "@mantine/core";
import { ITag } from "../../../../../shared/types/tags";
import { useNavigate } from "react-router";
import { IconProps } from "@core/design/icons/Icon";
import styles from "./TagCard.module.scss";
import { ArrowRightIcon, DotsThreeVerticalIcon, TagIcon } from "@phosphor-icons/react";

export type ITagAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, tag: ITag) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean;
};

interface ITagCardProps {
  tag: ITag;
  description?: string;
  titleIcon?: React.ReactNode;
  onClick?: (tag: ITag) => void;
  actions?: ITagAction[];
  variant?: "card" | "index";
}

export default function TagCard({
  tag,
  description,
  onClick,
  titleIcon,
  actions,
  variant = "card",
}: ITagCardProps) {
  const navigate = useNavigate();
  const desc = description || tag.description;

  const handleClick = () => {
    if (onClick) onClick(tag);
    else navigate(`/tags/${tag.id.toString()}`);
  };

  return (
    <div
      role="button"
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className={`${styles.tagCard} ${styles[variant]}`}
    >
      <Group justify="space-between" wrap="nowrap" className={styles.header}>
        <Group gap="sm" wrap="nowrap" className={styles.identity}>
          {variant === "index" && (
            <div className={styles.iconWell} aria-hidden="true">
              {titleIcon || <TagIcon weight="fill" />}
            </div>
          )}
          <div className={styles.copy}>
            {variant === "index" ? (
              <Text fw={650} className={styles.title}>
                {tag.name}
              </Text>
            ) : (
              <Badge size="lg" c="dark.8" bg="dark.3" leftSection={<TagIcon weight="bold" />}>
                {tag.name}
              </Badge>
            )}
            {variant === "index" && (
              <Text size="sm" c="dimmed" lineClamp={2} className={styles.description}>
                {desc || "No description yet"}
              </Text>
            )}
          </div>
        </Group>
        <Group gap={4} wrap="nowrap" className={styles.actions}>
          {!!actions?.length && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  aria-label={`Actions for ${tag.name}`}
                  size="md"
                  variant="subtle"
                  color="gray"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DotsThreeVerticalIcon />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {actions.map((action) => (
                  <Menu.Item
                    key={action.id}
                    leftSection={action.icon}
                    onClick={(event) => action.onClick(event, tag)}
                    color={action.color}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          {variant === "index" && <ArrowRightIcon className={styles.arrow} />}
        </Group>
      </Group>
      {variant === "card" && (
        <Group>
          <Text size="sm">{desc}</Text>
        </Group>
      )}
    </div>
  );
}
