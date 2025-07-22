import { ActionIcon, Group, MantineColor, Menu, Text } from "@mantine/core";
import { IIdea, ISafeIdea } from "../../../../../app/database/models/ideas";
import { getNodeDescription } from "../../../../utils/graph";
import { useNavigate } from "react-router";
import styles from "./IdeaCard.module.scss";
import { DotsThreeVerticalIcon, IconProps } from "@phosphor-icons/react";

export type IIdeaAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, idea: IIdea | ISafeIdea) => void;
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

export interface IIdeaCardProps {
  idea: ISafeIdea | IIdea;
  description?: string;
  titleIcon?: React.ReactNode;
  onClick?: (idea: ISafeIdea | IIdea) => void;
  actions?: IIdeaAction[];
}

const getIdeaDefaultSummary = (idea: ISafeIdea): string | undefined => {
  const desc = getNodeDescription({
    ...idea,
    type: "idea",
  });
  return desc;
};

export default function IdeaCard({
  idea,
  description,
  titleIcon,
  onClick,
  actions,
}: IIdeaCardProps) {
  const navigate = useNavigate();
  const desc = description ?? getIdeaDefaultSummary(idea);

  const handleClick = () => {
    if (onClick) {
      onClick(idea);
    } else {
      navigate(`/idea/${idea.id.toString()}`);
    }
  };

  return (
    <div
      role="button"
      onClick={() => {
        handleClick();
      }}
      className={styles.ideaCard}
    >
      <Group justify="space-between">
        <Group gap="xs">
          {titleIcon}
          <Text size="sm" fw="bold">
            {idea.title}
          </Text>
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
                        action.onClick(e, idea);
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
