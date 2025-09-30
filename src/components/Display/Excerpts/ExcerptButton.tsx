import React from "react";
import {
  ActionIcon,
  Blockquote,
  Box,
  Card,
  Group,
  MantineColor,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import styles from "./ExcerptButton.module.scss";
import { useState } from "react";
import {
  IconProps,
  ArrowRightIcon,
  FileTextIcon,
  EyeIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import {
  IExcerpt,
  IExcerptReference,
} from "../../../../app/database/models/excerpt";
import { useDisclosure } from "@mantine/hooks";
import { useLayout } from "../../../contexts/LayoutContext";
import ExcerptableThing from "./ExcerptableThing";
import { ISource } from "../../../../app/database/models/source";
import { getNodeLinkFromId, NodeIcon } from "../../../utils/graph";
import { useLandscape } from "../../../contexts/LandscapeContext";

type IExcerptButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface IExcerptButtonProps {
  excerpt: IExcerpt;
  actions?: IExcerptButtonAction[];
  fullWidth?: boolean;
  onClick?: (excerpt: IExcerpt, e: React.MouseEvent) => void;
}

function ExcerptButton({
  excerpt,
  actions,
  fullWidth = false,
  onClick,
}: IExcerptButtonProps) {
  const [hovering, setHovering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const {
    connectable: {
      dragging: { set: setDragging },
    },
  } = useLandscape();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging({
      ...excerpt,
      type: "excerpt",
    });
    setIsInternallyDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        excerptId: excerpt.id.toString(),
        thingId: excerpt.id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(null);
    setIsInternallyDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(excerpt, e);
    }
  };

  const navigate = useNavigate();

  const { isMobile } = useLayout();

  const allActions: IExcerptButtonAction[] = [
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
        if (typeof excerpt.references === "string") {
          const link = getNodeLinkFromId(excerpt.references);
          if (link) {
            navigate(link);
          }
        }
      },
      icon: <ArrowRightIcon />,
    },
  ];

  const [opened, { toggle, open, close }] = useDisclosure();

  const references = excerpt.references?.toString
    ? null
    : (excerpt.references as IExcerptReference);

  const Icon = excerpt
    ? NodeIcon({
        ...excerpt,
        type: "excerpt",
      })
    : null;

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
          data-thing-id={excerpt.id.toString()}
          data-excerpt-id={excerpt.id.toString()}
          className={`${styles.excerptButton} ${fullWidth ? styles["full-width"] : ""}`}
          draggable={true}
          tabIndex={0}
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
            <Group gap="xs" align="baseline" wrap="nowrap">
              <Box w="16px">
                {Icon && (
                  <Icon
                    color="var(--mantine-color-gray-4)"
                    size={16}
                    weight="regular"
                    className={styles.indicator}
                  />
                )}
              </Box>
              <Text size="sm" lineClamp={1}>
                {excerpt.note || excerpt.sourceText}
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
          {references && (
            <Card p="xs">
              <ExcerptableThing thing={references} />
            </Card>
          )}
          <Blockquote p="xs" color="gray">
            <Text size="sm">{excerpt.sourceText}</Text>
          </Blockquote>
          <Text size="sm">{excerpt.note || "No note."}</Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default ExcerptButton;
