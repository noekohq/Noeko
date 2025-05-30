import { Badge, HoverCard } from "@mantine/core";
import { ITag } from "../../../app/database/models/tag";
import { useSettings } from "../../contexts/SettingsContext";
import { Link } from "react-router";

type ITagProps = {
  tag: ITag;
  variant?: string;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  link?: boolean;
};

export default function Tag({
  tag,
  variant,
  leftSection,
  rightSection,
  link = true,
}: ITagProps) {
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
          color={scheme === "dark" ? "dark.5" : "dark.7"}
          c={scheme === "dark" ? "dark.2" : "dark.3"}
          styles={{
            root: {
              border: "1px solid var(--mantine-color-dark-6)",
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
