import {
  ActionIcon,
  Badge,
  Button,
  Group,
  MantineColor,
  Menu,
  Modal,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { IIdea, ISafeIdea } from "../../../../../shared/types/idea";
import { getNodeDescription } from "../../../../utils/graph";
import { Link, useNavigate } from "react-router";
import styles from "./IdeaCard.module.scss";
import {
  ArrowRightIcon,
  ArrowsOutIcon,
  DotsThreeVerticalIcon,
  IconProps,
} from "@phosphor-icons/react";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";

const getIdeaDefaultSummary = (idea: ISafeIdea): string | undefined => {
  const desc = getNodeDescription({
    ...idea,
    type: "idea",
  });
  if (!desc) {
    return "No preview available.";
  }
  return desc;
};

const getIdeaDefaultDetails = (idea: ISafeIdea): React.ReactNode => {
  if (idea.content) {
    return <div dangerouslySetInnerHTML={{ __html: idea.content }} />;
  }
  return (
    <Text size="sm" c="dimmed">
      No preview available.
    </Text>
  );
};

export type IIdeaAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, idea: ISafeIdea) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
};

export type IIdeaBadge = {
  label: string;
  color?: MantineColor;
  icon?: React.ReactElement<IconProps>;
};

export interface IIdeaCardProps {
  idea: ISafeIdea | IIdea;
  description?: string | React.ReactNode;
  titleIcon?: React.ReactNode;
  onClick?: (idea: ISafeIdea) => void;
  actions?: IIdeaAction[];
  actionsVisible?: number;
  titleLines?: number;
  descriptionLines?: number;
  details?: React.ReactNode;
  badges?: IIdeaBadge[];
}

export default function IdeaCard({
  idea,
  description,
  titleIcon,
  onClick,
  actions,
  titleLines = 2,
  descriptionLines = 3,
  actionsVisible = 0,
  details,
  badges,
}: IIdeaCardProps) {
  const navigate = useNavigate();
  const desc = description ?? getIdeaDefaultSummary(idea);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ideaId: idea.id.toString(),
        thingId: idea.id.toString(),
      })
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {};

  const handleClick = () => {
    if (onClick) {
      onClick(idea);
    } else {
      navigate(`/idea/${idea.id.toString()}`);
    }
  };

  const getHiddenActions = () => {
    return actions?.slice(actionsVisible);
  };

  const getVisibleActions = () => {
    return actions?.slice(0, actionsVisible);
  };

  const hiddenActions = getHiddenActions() ?? [];
  const visibleActions = getVisibleActions() ?? [];

  const hoverDetails = details ?? getIdeaDefaultDetails(idea);

  const [opened, { open, close, toggle }] = useDisclosure();
  const [previewing, setPreviewing] = useState(false);

  return (
    <>
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
            data-idea-id={idea.id.toString()}
            className={styles.ideaCard}
            draggable={true}
            onClick={() => {
              handleClick();
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleClick();
              }
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onContextMenu={(e) => {
              e.preventDefault();
              toggle();
            }}
          >
            <div className={styles.content}>
              <Group gap="xs">
                {titleIcon}
                <Text size="sm" fw="bold" lineClamp={titleLines}>
                  {idea.title}
                </Text>
              </Group>
              <Group>
                <Text size="sm" lineClamp={descriptionLines}>
                  {desc}
                </Text>
              </Group>
              <Group justify="space-between">
                {badges?.length && (
                  <Group gap="xs">
                    {badges.map((badge) => {
                      return (
                        <Badge leftSection={badge.icon} color={badge.color} size={"sm"}>
                          {badge.label}
                        </Badge>
                      );
                    })}
                  </Group>
                )}
                {visibleActions.length && (
                  <Group gap="xs">
                    {visibleActions.map((action) => {
                      return (
                        <Button
                          key={action.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(e, idea);
                          }}
                          color={action.color ?? "dark.1"}
                          disabled={action.disabled}
                          leftSection={action.icon}
                          size="xs"
                          variant="light"
                        >
                          {action.label}
                        </Button>
                      );
                    })}
                  </Group>
                )}
              </Group>
            </div>
            <div className={styles.actions}>
              {!!hiddenActions?.length && (
                <Menu position="bottom-end" withArrow>
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
                    {hiddenActions?.map((action) => {
                      return (
                        <Menu.Item
                          key={action.id}
                          leftSection={action.icon}
                          onClick={(e) => {
                            e.stopPropagation();
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
            <Group wrap="nowrap" gap="sm" justify="space-between">
              <Text size="md">{idea.title}</Text>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="sm"
                  radius="md"
                  onClick={() => {
                    setPreviewing(true);
                  }}
                >
                  <ArrowsOutIcon />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="sm"
                  radius="md"
                  onClick={() => {
                    navigate(`/idea/${idea.id.toString()}`);
                  }}
                >
                  <ArrowRightIcon />
                </ActionIcon>
              </Group>
            </Group>
            <Text
              size="sm"
              dangerouslySetInnerHTML={{
                __html: idea.content,
              }}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
      <Modal
        opened={previewing}
        onClose={() => {
          setPreviewing(false);
        }}
        title={<Text size="sm">Previewing {idea.title}</Text>}
        onClick={(e) => {
          e.stopPropagation();
        }}
        size="lg"
      >
        <Stack py="lg" gap="xs">
          <Group>
            <Button
              onClick={() => {
                navigate(`/idea/${idea.id.toString()}`);
              }}
              rightSection={<ArrowRightIcon size={12} />}
              color="gray"
              variant="light"
              size="xs"
              radius="lg"
            >
              Visit
            </Button>
          </Group>
          <div
            dangerouslySetInnerHTML={{
              __html: idea.content,
            }}
          />
        </Stack>
      </Modal>
    </>
  );
}
