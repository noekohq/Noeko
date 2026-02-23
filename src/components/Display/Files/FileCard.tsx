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
import { IUserFile } from '../../../../app/database/models/userfile';
import { getNodeDescription } from '@infrastructure/graph/utils';
import { Link, useNavigate } from "react-router";
import styles from "./FileCard.module.scss";
import {
  ArrowRightIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  IconProps,
} from "@phosphor-icons/react";
import { handleFileDownload } from '@/utils/userfiles';
import { formatDate, formatDateTime } from '@/utils/formatting';

const getFileDefaultSummary = (file: IUserFile): string | undefined => {
  const desc = `Uploaded ${formatDateTime(file.createdAt)}`;
  if (!desc) {
    return "No preview available.";
  }
  return desc;
};

const getFileDefaultDetails = (file: IUserFile): React.ReactNode => {
  return (
    <Text size="sm" c="dimmed">
      Created {formatDate(file.createdAt)}, last updated {formatDate(file.updatedAt)}
    </Text>
  );
};

export type IFileAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, file: IUserFile) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
};

export interface IFileCardProps {
  file: IUserFile;
  description?: string | React.ReactNode;
  onClick?: (file: IUserFile) => void;
  actions?: IFileAction[];
  actionsVisible?: number;
  titleLines?: number;
  descriptionLines?: number;
  details?: React.ReactNode;
}

export default function FileCard({
  file,
  description,
  onClick,
  actions,
  titleLines = 2,
  descriptionLines = 3,
  actionsVisible = 0,
  details,
}: IFileCardProps) {
  const navigate = useNavigate();
  const desc = description ?? getFileDefaultSummary(file);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        fileId: file.id.toString(),
      })
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {};

  const handleClick = () => {
    if (onClick) {
      onClick(file);
    } else {
      navigate(`/file/${file.id.toString()}`);
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

  const hoverDetails = details ?? getFileDefaultDetails(file);

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
      className={styles.fileCard}
      data-file-id={file.id.toString()}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={true}
    >
      <HoverCard radius="lg" openDelay={500} width={"400px"} withArrow position="bottom-start">
        <HoverCard.Target>
          <div className={styles.content}>
            <Group gap="xs">
              <Text size="sm" fw="bold" lineClamp={titleLines}>
                {file.originalFileName}
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
                      action.onClick(e, file);
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
              <Link to={`/file/${file.id.toString()}`}>
                <ActionIcon size="sm" color="dark.3" variant="light">
                  <ArrowRightIcon weight="bold" />
                </ActionIcon>
              </Link>
              <Tooltip label="Download this file.">
                <ActionIcon
                  size="sm"
                  color="dark.3"
                  variant="light"
                  onClick={() => {
                    handleFileDownload(file);
                  }}
                >
                  <DownloadSimpleIcon weight="bold" />
                </ActionIcon>
              </Tooltip>
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
                      action.onClick(e, file);
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
