import React from "react";
import { ActionIcon, Group, MantineColor, Text, Tooltip } from "@mantine/core";
import { IIdea, PhosphorIcon } from "./IdeaCardTypes";
import styles from "./IdeaButton.module.scss";
import { useState } from "react";
import { IconProps } from "@phosphor-icons/react";

type IIdeaButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface IIdeaButton {
  idea: IIdea;
  bg?: MantineColor | string;
  color?: MantineColor | string;
  actions?: IIdeaButtonAction[];
  link?: boolean;
  draggable?: boolean;
}

function IdeaButton({
  idea,
  actions,
  link = true,
  draggable,
  bg,
  color,
}: IIdeaButton) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      data-idea-id={idea.id.toString()}
      className={styles.ideaButton}
      draggable={draggable}
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      <Group justify="space-between" wrap="nowrap" w="100%">
        <Text
          className={styles.title}
          fw="bold"
          c="dark.2"
          size="sm"
          truncate="end"
        >
          {idea.title}
        </Text>
        {hovering && (
          <Group>
            {actions?.map((action) => {
              return (
                <ActionIcon
                  size="xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    action.onClick(e);
                  }}
                  variant="subtle"
                  color={action.color ? action.color : "dark.4"}
                  title={action.tooltip}
                >
                  {action.icon
                    ? React.cloneElement(action.icon, {
                        size: 12,
                      })
                    : undefined}
                </ActionIcon>
              );
            })}
          </Group>
        )}
      </Group>
    </div>
  );
}

export default IdeaButton;
