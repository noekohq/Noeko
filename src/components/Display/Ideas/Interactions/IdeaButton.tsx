import React from "react";
import {
  ActionIcon,
  Group,
  HoverCard,
  MantineColor,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IIdea, PhosphorIcon } from "../IdeaCardTypes";
import styles from "./IdeaButton.module.scss";
import { useState } from "react";
import {
  IconProps,
  ArrowRightIcon,
  LightbulbIcon,
} from "@phosphor-icons/react";
import { Link } from "react-router";
import { getNodeDescription } from "../../../../utils/graph";
import { ISafeIdea } from "../../../../../app/database/models/ideas";

const getIdeaDefaultDetails = (idea: IIdea | ISafeIdea): React.ReactNode => {
  if (idea.content) {
    return (
      <Stack>
        <Title order={3}>{idea.title}</Title>
        <div dangerouslySetInnerHTML={{ __html: idea.content }} />
      </Stack>
    );
  }
  return (
    <Text size="sm" c="dimmed">
      No preview available.
    </Text>
  );
};

type IIdeaButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface IIdeaButton {
  idea: IIdea | ISafeIdea;
  bg?: MantineColor | string;
  color?: MantineColor | string;
  actions?: IIdeaButtonAction[];
  link?: boolean;
  draggable?: boolean;
  fullWidth?: boolean;
  onClick?: (idea: IIdea | ISafeIdea, e: React.MouseEvent) => void;
}

function IdeaButton({
  idea,
  actions,
  link = true,
  draggable,
  bg,
  color,
  fullWidth = false,
  onClick,
}: IIdeaButton) {
  const [hovering, setHovering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    setIsInternallyDragging(true);
    e.dataTransfer.setData("application/json", JSON.stringify(idea));
  };

  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    setIsInternallyDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(idea, e);
    }
  };

  const hoverDetails = getIdeaDefaultDetails(idea);

  return (
    <HoverCard radius="lg" openDelay={500} width={"400px"} withArrow>
      <HoverCard.Target>
        <button
          data-idea-id={idea.id.toString()}
          className={`${styles.ideaButton} ${fullWidth ? styles["full-width"] : ""}`}
          draggable={draggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onMouseEnter={() => {
            setHovering(true);
          }}
          onMouseLeave={() => {
            setHovering(false);
          }}
          disabled={isInternallyDragging}
        >
          <Group justify="space-between" wrap="nowrap" w="100%">
            <Text className={styles.title} c="dark.1" size="sm" truncate="end">
              <Group gap="xs" wrap="nowrap">
                {idea.title}
              </Group>
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
        </button>
      </HoverCard.Target>
      <HoverCard.Dropdown
        style={{
          overflowY: "scroll",
          maxHeight: "400px",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Group>
          <Link to={`/idea/${idea.id.toString()}`}>
            <ActionIcon size="sm" color="dark.3" variant="light">
              <ArrowRightIcon weight="bold" />
            </ActionIcon>
          </Link>
        </Group>
        {hoverDetails}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

export default IdeaButton;
