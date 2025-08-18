import React from "react";
import {
  ActionIcon,
  Group,
  HoverCard,
  MantineColor,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import styles from "./SourceButton.module.scss";
import { useState } from "react";
import {
  IconProps,
  ArrowRightIcon,
  LightbulbIcon,
  FileTextIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import { getNodeDescription } from "../../../utils/graph";
import { ISource } from "../../../../app/database/models/source";

type ISourceButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface ISourceButtonProps {
  source: ISource;
  bg?: MantineColor | string;
  color?: MantineColor | string;
  actions?: ISourceButtonAction[];
  link?: boolean;
  draggable?: boolean;
  fullWidth?: boolean;
  onClick?: (source: ISource, e: React.MouseEvent) => void;
}

function SourceButton({
  source,
  actions,
  link = true,
  draggable,
  bg,
  color,
  fullWidth = false,
  onClick,
}: ISourceButtonProps) {
  const [hovering, setHovering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        sourceId: source.id.toString(),
        thingId: source.id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(source, e);
    }
  };

  const navigate = useNavigate();

  const allActions: ISourceButtonAction[] = [
    ...(actions || []),
    {
      id: "view",
      onClick: () => {
        navigate(`/source/${source.id.toString()}`);
      },
      icon: <ArrowRightIcon />,
    },
  ];

  return (
    <div
      role="button"
      data-thing-id={source.id.toString()}
      data-source-id={source.id.toString()}
      className={`${styles.sourceButton} ${fullWidth ? styles["full-width"] : ""}`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      <Group justify="space-between" wrap="nowrap" w="100%">
        <Group gap="xs" wrap="nowrap">
          <Text className={styles.title} c="dark.1" size="sm" truncate="end">
            {source.displayName}
          </Text>
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
      </Group>
    </div>
  );
}

export default SourceButton;
