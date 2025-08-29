import {
  ActionIcon,
  Box,
  Group,
  HoverCard,
  MantineColor,
  Menu,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { formatDateTime } from "../../../utils/formatting";
import { useNavigate } from "react-router";
import { IconProps } from "../../Utils/Icons/Icon";
import styles from "./RabbitholeButton.module.scss";
import { ArrowRightIcon, DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";
import { IRabbitholeAction } from "./rabbitholes";
import RabbitholeThing from "./RabbitholeThing";
import { useDisclosure } from "@mantine/hooks";
import React, { useState } from "react";
import { getNodeDescription } from "../../../utils/graph";

interface IRabbitholeButtonProps {
  rabbithole: IRabbithole;
  description?: string;
  onClick?: (rabbithole: IRabbithole) => void;
  actions?: IRabbitholeAction[];
  fullWidth?: boolean;
}

const getRabbitholeDefaultSummary = (
  rabbithole: IRabbithole,
): string | undefined => {
  return getNodeDescription({
    ...rabbithole,
    type: "rabbithole",
  });
};

export default function RabbitholeButton({
  rabbithole,
  description,
  onClick,
  actions,
  fullWidth,
}: IRabbitholeButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(rabbithole);
    } else {
      navigate(`/rabbitholes/${rabbithole.id.toString()}`);
    }
  };

  const desc = description || getRabbitholeDefaultSummary(rabbithole);

  const [opened, { toggle, open, close }] = useDisclosure();

  const [hovering, setHovering] = useState(false);
  const allActions: IRabbitholeAction[] = [
    ...(actions || []),
    {
      id: "view",
      label: "View",
      onClick: () => {
        navigate(`/rabbithole/${rabbithole.id.toString()}`);
      },
      icon: <ArrowRightIcon />,
    },
  ];

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
          data-thing-id={rabbithole.id.toString()}
          data-rabbithole-id={rabbithole.id.toString()}
          className={`${styles.rabbitholeButton} ${fullWidth ? styles["full-width"] : ""}`}
          onClick={() => {
            handleClick();
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleClick();
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
            <Group gap="xs" wrap="nowrap" align="center">
              <Box w="16px">
                <RabbitholeIcon
                  size={16}
                  color="var(--mantine-color-gray-4)"
                  className={styles.indicator}
                />
              </Box>
              <Text size="sm" lineClamp={0}>
                {rabbithole.name}
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
                        action.onClick(e, rabbithole);
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
      <Popover.Dropdown>
        <Stack>
          <Text size="sm" c="dimmed">
            {desc}
          </Text>
          {rabbithole.includes?.map((thing) => {
            return <RabbitholeThing thing={thing} rabbithole={rabbithole} />;
          })}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
