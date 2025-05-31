import {
  Badge,
  Card,
  Group,
  HoverCard,
  Paper,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { ITag } from "../../../app/database/models/tag";
import { useSettings } from "../../contexts/SettingsContext";
import { Link } from "react-router";
import { Tag } from "@phosphor-icons/react";

type IInlineTagProps = {
  tag: ITag;
  variant?: string;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  link?: boolean;
  color?: string;
};

export function InlineTag({
  tag,
  variant,
  leftSection,
  rightSection,
  link = true,
  color,
}: IInlineTagProps) {
  const {
    ui: {
      theme: {
        scheme: { actual: scheme },
      },
    },
  } = useSettings();

  return (
    <HoverCard withArrow>
      <HoverCard.Target>
        <Badge
          variant={variant || "light"}
          color={color ? color : scheme === "dark" ? "dark.5" : "dark.7"}
          c={!color ? (scheme === "dark" ? "dark.2" : "dark.3") : undefined}
          styles={{
            root: {
              border: !color
                ? "1px solid var(--mantine-color-dark-6)"
                : undefined,
            },
          }}
          leftSection={leftSection}
          rightSection={rightSection}
          component={link ? Link : undefined}
          to={link ? `/tags/${tag.id.toString()}` : ""}
        >
          {tag.name}
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown>{tag.description}</HoverCard.Dropdown>
    </HoverCard>
  );
}

type IBlockTagProps = {
  tag: ITag;
  variant?: string;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  link?: boolean;
  className?: string; // Optional className prop for further customization
  color?: string;
};

export function BlockTag({
  tag,
  variant,
  leftSection,
  rightSection,
  link = true,
  className,
  color,
}: IBlockTagProps) {
  const {
    ui: {
      theme: {
        scheme: { actual: scheme },
      },
    },
  } = useSettings();

  return (
    <HoverCard withArrow>
      <HoverCard.Target>
        <Badge
          size="xl"
          className={className}
          variant={variant || "light"}
          color={color ? color : scheme === "dark" ? "dark.5" : "dark.7"}
          c={!color ? (scheme === "dark" ? "dark.2" : "dark.3") : undefined}
          styles={{
            root: {
              border: !color
                ? "1px solid var(--mantine-color-dark-6)"
                : undefined,
            },
          }}
          leftSection={
            leftSection ? leftSection : <Tag weight="bold" size={18} />
          }
          rightSection={rightSection}
          component={link ? Link : undefined}
          to={link ? `/tags/${tag.id.toString()}` : ""}
        >
          {tag.name}
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown>{tag.description}</HoverCard.Dropdown>
    </HoverCard>
  );
}
