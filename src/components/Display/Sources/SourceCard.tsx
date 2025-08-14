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
  Tooltip,
} from "@mantine/core";
import { IUserFile } from "../../../../app/database/models/userfile";
import { getNodeDescription } from "../../../utils/graph";
import { Link, useNavigate } from "react-router";
import styles from "./SourceCard.module.scss";
import {
  ArrowRightIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  IconProps,
} from "@phosphor-icons/react";
import { handleFileDownload } from "../../../utils/userfiles";
import { formatDate } from "../../../utils/formatting";
import { ISource } from "../../../../app/database/models/source";
import { getSourceName } from "../../../utils/sources";

const getSourceDefaultSummary = (source: ISource): string | undefined => {
  const desc = getNodeDescription({
    ...source,
    type: "source",
  });
  if (!desc) {
    return "No preview available.";
  }
  return desc;
};

const getSourceDefaultDetails = (source: ISource): React.ReactNode => {
  return (
    <Text size="sm" c="dimmed">
      Created {formatDate(source.createdAt)}, last updated{" "}
      {formatDate(source.updatedAt)}
    </Text>
  );
};

export type ISourceAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, source: ISource) => void;
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

export interface ISourceCardProps {
  source: ISource;
  description?: string | React.ReactNode;
  onClick?: (source: ISource) => void;
  actions?: ISourceAction[];
  actionsVisible?: number;
  titleLines?: number;
  descriptionLines?: number;
  details?: React.ReactNode;
}

export default function SourceCard({
  source,
  description,
  onClick,
  actions,
  titleLines = 2,
  descriptionLines = 3,
  actionsVisible = 0,
  details,
}: ISourceCardProps) {
  const navigate = useNavigate();
  const desc = description ?? getSourceDefaultSummary(source);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        sourceId: source.id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {};

  const handleClick = () => {
    if (onClick) {
      onClick(source);
    } else {
      navigate(`/source/${source.id.toString()}`);
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

  const hoverDetails = details ?? getSourceDefaultDetails(source);

  return (
    <div
      role="button"
      onClick={() => {
        handleClick();
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleClick();
        }
      }}
      className={styles.sourceCard}
      data-file-id={source.id.toString()}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={true}
    >
      <HoverCard
        radius="lg"
        openDelay={500}
        width={"400px"}
        withArrow
        position="bottom-start"
      >
        <HoverCard.Target>
          <div className={styles.content}>
            <Group gap="xs">
              <Text size="sm" fw="bold" lineClamp={titleLines}>
                {source.displayName}
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
                      action.onClick(e, source);
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
          style={{ overflowY: "scroll", maxHeight: "400px" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Stack>
            <Group>
              <Link to={`/source/${source.id.toString()}`}>
                <ActionIcon size="sm" color="dark.3" variant="light">
                  <ArrowRightIcon weight="bold" />
                </ActionIcon>
              </Link>
            </Group>
            {hoverDetails}
          </Stack>
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
                      action.onClick(e, source);
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
