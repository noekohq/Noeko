import {
  ActionIcon,
  Button,
  Card,
  Group,
  HoverCard,
  MantineColor,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { IIdea, ISafeIdea } from "../../../../../app/database/models/ideas";
import { getNodeDescription } from "../../../../utils/graph";
import { Link, useNavigate } from "react-router";
import styles from "./IdeaCard.module.scss";
import {
  ArrowRightIcon,
  DotsThreeVerticalIcon,
  IconProps,
} from "@phosphor-icons/react";
import OverviewAccordion from "../OverviewAccordion";

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
  variant?:
    | "filled"
    | "light"
    | "outline"
    | "default"
    | "subtle"
    | "transparent"
    | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
};

export interface IIdeaCardProps {
  idea: ISafeIdea | IIdea;
  description?: string;
  titleIcon?: React.ReactNode;
  onClick?: (idea: ISafeIdea) => void;
  actions?: IIdeaAction[];
  actionsVisible?: number;
  titleLines?: number;
  descriptionLines?: number;
  details?: React.ReactNode;
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
}: IIdeaCardProps) {
  const navigate = useNavigate();
  const desc = description ?? getIdeaDefaultSummary(idea);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ideaId: idea.id.toString(),
      }),
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

  return (
    <div
      role="button"
      onClick={() => {
        handleClick();
      }}
      className={styles.ideaCard}
      data-idea-id={idea.id.toString()}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={true}
    >
      <HoverCard radius="lg" openDelay={500} width={"400px"} withArrow>
        <HoverCard.Target>
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
            <Group>
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
          </div>
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
  );
}
