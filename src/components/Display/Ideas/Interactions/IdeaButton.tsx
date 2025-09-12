import React from "react";
import {
  ActionIcon,
  Group,
  MantineColor,
  Popover,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IIdea } from "../IdeaCardTypes";
import styles from "./IdeaButton.module.scss";
import { useState } from "react";
import { IconProps, ArrowRightIcon, EyeIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { ISafeIdea } from "../../../../../app/database/models/ideas";
import { useDisclosure } from "@mantine/hooks";
import { useLayout } from "../../../../contexts/LayoutContext";

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
  actions?: IIdeaButtonAction[];
  fullWidth?: boolean;
  onClick?: (
    idea: IIdea | ISafeIdea,
    e: React.MouseEvent | React.KeyboardEvent,
  ) => void;
}

function IdeaButton({
  idea,
  actions,
  fullWidth = false,
  onClick,
}: IIdeaButton) {
  const [hovering, setHovering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ideaId: idea.id.toString(),
        thingId: idea.id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(false);
  };

  const handleClick = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (onClick) {
      onClick(idea, e);
    }
  };

  const navigate = useNavigate();

  const hoverDetails = getIdeaDefaultDetails(idea);

  const { isMobile } = useLayout();

  const allActions: IIdeaButtonAction[] = [
    ...(actions || []),
    ...(isMobile
      ? [
          {
            id: "preview",
            onClick: () => {
              toggle();
            },
            icon: <EyeIcon />,
          },
        ]
      : []),
    {
      id: "view",
      onClick: () => {
        navigate(`/idea/${idea.id.toString()}`);
      },
      icon: <ArrowRightIcon />,
    },
  ];

  const [opened, { open, close, toggle }] = useDisclosure();

  return (
    <Popover
      opened={opened}
      closeOnClickOutside
      onChange={(o) => {
        if (o) {
          open();
        } else {
          close();
        }
      }}
      width="400px"
      shadow="lg"
      radius="md"
      transitionProps={{
        transition: "fade-down",
        duration: 200,
        timingFunction: "ease-out",
      }}
    >
      <Popover.Target>
        <div
          role="button"
          data-thing-id={idea.id.toString()}
          data-idea-id={idea.id.toString()}
          className={`${styles.ideaButton} ${fullWidth ? styles["full-width"] : ""}`}
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleClick(e);
            }
          }}
          onMouseEnter={() => {
            setHovering(true);
          }}
          onMouseLeave={() => {
            setHovering(false);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            toggle();
          }}
        >
          <Group justify="space-between" wrap="nowrap" w="100%">
            <Text className={styles.title} c="dark.1" size="sm" truncate="end">
              <Group gap="xs" wrap="nowrap">
                {idea.title}
              </Group>
            </Text>
            {hovering && (
              <Group wrap="nowrap" gap="xs">
                {allActions?.map((action) => {
                  return (
                    <ActionIcon
                      key={action.id}
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
      </Popover.Target>
      <Popover.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          maxHeight: "400px",
          overflowY: "scroll",
        }}
      >
        <Stack gap="xs">
          <Text c="dimmed" fw="bold" size="sm">
            {idea.title}
          </Text>
          <Text
            size="sm"
            dangerouslySetInnerHTML={{
              __html: idea.content,
            }}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default IdeaButton;
