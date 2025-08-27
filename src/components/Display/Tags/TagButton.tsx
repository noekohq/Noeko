import React from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  MantineColor,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import styles from "./TagButton.module.scss";
import { useState } from "react";
import { IconProps, ArrowRightIcon, TagIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import { getNodeDescription } from "../../../utils/graph";
import { ITag } from "../../../../app/database/models/tag";
import { useDisclosure } from "@mantine/hooks";

type ITagButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface ITagButtonProps {
  tag: ITag;
  bg?: MantineColor | string;
  color?: MantineColor | string;
  actions?: ITagButtonAction[];
  link?: boolean;
  fullWidth?: boolean;
  onClick?: (tag: ITag, e: React.MouseEvent) => void;
}

function TagButton({
  tag,
  actions,
  link = true,
  bg,
  color,
  fullWidth = false,
  onClick,
}: ITagButtonProps) {
  const [hovering, setHovering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        tagId: tag.id.toString(),
        thingId: tag.id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(tag, e);
    }
  };

  const navigate = useNavigate();

  const allActions: ITagButtonAction[] = [
    ...(actions || []),
    {
      id: "view",
      onClick: () => {
        navigate(`/tags/${tag.id.toString()}`);
      },
      icon: <ArrowRightIcon />,
    },
  ];

  const [opened, { toggle, open, close }] = useDisclosure();

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
      width="target"
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
          data-thing-id={tag.id.toString()}
          data-tag-id={tag.id.toString()}
          className={`${styles.tagButton} ${fullWidth ? styles["full-width"] : ""}`}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
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
          <div className={styles.content}>
            <Group gap="xs" align="center">
              <Flex w="14px" h="100%" justify="center" align="center">
                <TagIcon size={14} />
              </Flex>
              {tag.name}
            </Group>
            {hovering && (
              <Group>
                {allActions?.map((action) => {
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
          </div>
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
            {tag.name}
          </Text>
          <Text size="sm">{tag.description}</Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default TagButton;
