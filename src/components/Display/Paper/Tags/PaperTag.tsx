import {
  ArrowRightIcon,
  PlusIcon,
  TagIcon,
  XIcon,
} from "@phosphor-icons/react";
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

  const handleClick = () => {
    if (!tag) return;
    if (active && onRemove) {
      onRemove(tag.id.toString());
    } else if (onApply) {
      onApply(tag.id.toString());
    }
  };

  const handleClickWrapper = () => {
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

  const Icon = () => {
    if (opened) {
      return <XIcon weight="bold" />;
    }
    return <TagIcon weight="bold" />;
  };

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
        >
          {opened ? <XIcon weight="bold" /> : <Icon />}
          {tag?.name}
        </button>
      </Popover.Target>
      <Popover.Dropdown w={300}>
        <div className={styles.context}>
          <Stack>
            <Group>
              <Link to={`/tags/${tag?.id}`}>
                <PaperIcon aria-label="View tag" withBorder>
                  <ArrowRightIcon weight="bold" />
                </PaperIcon>
              </Link>
            </Group>
            <Text size="md">
              {tag?.description || "No description provided."}
            </Text>
          </Stack>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
