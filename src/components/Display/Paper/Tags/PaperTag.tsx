import { ArrowRightIcon, TagIcon } from "@phosphor-icons/react";
import styles from "./PaperTag.module.scss";
import { ITag } from "../../../../../app/database/models/tag";
import React, { useRef, useState } from "react";
import { Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import PaperIcon from "../PaperIcon";
import { Link } from "react-router";

export type ITagState = "applied" | "suggested" | "display";

interface IPaperTagProps {
  onClick?: () => void;
  active?: boolean;
  tag?: ITag;
  onRemove?: (tagId: string) => void;
  onApply?: (tagId: string) => void;
  state: ITagState;
}

export default function PaperTag({
  onClick,
  active = false,
  tag,
  onRemove,
  onApply,
  state,
}: IPaperTagProps) {
  const [opened, { open, close, toggle }] = useDisclosure();
  const [isLongPress, setIsLongPress] = useState(false);
  const pressTimeout = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = () => {
    pressTimeout.current = setTimeout(() => {
      open();
      setIsLongPress(true); // It was a long press
      pressTimeout.current = null;
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
      pressTimeout.current = null;
    }
  };

  const handleClick = () => {
    if (!tag) return;
    if (active && onRemove) {
      onRemove(tag.id.toString());
    } else if (onApply) {
      onApply(tag.id.toString());
    }
  };

  const handleClickWrapper = () => {
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }
    if (opened) {
      close();
      return;
    }
    handleClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle();
  };

  const classNames = [
    styles.paperTag,
    active && styles.active,
    state === "applied" && styles.applied,
    state === "suggested" && styles.suggested,
  ].filter(Boolean);

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
      shadow="md"
    >
      <Popover.Target>
        <button
          className={classNames.join(" ")}
          onClick={handleClickWrapper}
          onContextMenu={handleContextMenu}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
        >
          <TagIcon weight="bold" />
          {tag?.name}
        </button>
      </Popover.Target>
      <Popover.Dropdown w={200}>
        <div className={styles.context}>
          <Stack>
            <Group>
              <Link to={`/tags/${tag?.id}`}>
                <PaperIcon aria-label="View tag" withBorder>
                  <ArrowRightIcon weight="bold" />
                </PaperIcon>
              </Link>
            </Group>
            <Text size="sm">
              {tag?.description || "No description provided."}
            </Text>
          </Stack>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
