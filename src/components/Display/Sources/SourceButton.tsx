import React from "react";
import { ActionIcon, Box, Group, MantineColor, Popover, Stack, Text } from "@mantine/core";
import styles from "./SourceButton.module.scss";
import { useState } from "react";
import { IconProps, ArrowRightIcon, FileTextIcon, EyeIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { ISource } from "../../../../app/database/models/source";
import { useDisclosure } from "@mantine/hooks";
import { useLayout } from '@/contexts/LayoutContext';
import { useLandscape } from '@/contexts/LandscapeContext';

type ISourceButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface ISourceButtonProps {
  source: ISource;
  actions?: ISourceButtonAction[];
  fullWidth?: boolean;
  onClick?: (source: ISource, e: React.MouseEvent | React.KeyboardEvent) => void;
  link?: boolean;
}

function SourceButton({
  source,
  actions,
  fullWidth = false,
  onClick,
  link = false,
}: ISourceButtonProps) {
  const [hovering, setHovering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const {
    dragging: {
      current: { set: setDragging },
    },
  } = useLandscape();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(source.id.toString());
    setIsInternallyDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        sourceId: source.id.toString(),
        thingId: source.id.toString(),
      })
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(false);
    setDragging(null);
  };

  const handleClick = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (onClick) {
      onClick(source, e);
    }
    if (link) {
      navigate(`/source/${source.id.toString()}`);
    }
  };

  const navigate = useNavigate();

  const { isMobile } = useLayout();

  const allActions: ISourceButtonAction[] = [
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
        navigate(`/source/${source.id.toString()}`);
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
          data-thing-id={source.id.toString()}
          data-source-id={source.id.toString()}
          className={`${styles.sourceButton} ${fullWidth ? styles["full-width"] : ""}`}
          draggable={true}
          tabIndex={0}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleClick(e);
            }
            if (e.key === "ArrowRight") {
              navigate(`/source/${source.id.toString()}`);
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
          <div className={styles.content}>
            <Group gap="xs" align="baseline" wrap="nowrap">
              <Box w="16px">
                <FileTextIcon
                  color="var(--mantine-color-gray-4)"
                  size={16}
                  weight="regular"
                  className={styles.indicator}
                />
              </Box>
              <Text size="sm" lineClamp={1}>
                {source.displayName}
              </Text>
            </Group>
            {hovering && (
              <Group gap="xs" wrap="nowrap">
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
            {source.displayName}
          </Text>
          <Text size="sm">{source.analysis?.abstract}</Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default SourceButton;
