import { Badge, Popover } from "@mantine/core";
import { ITag } from "../../../app/database/models/tag";
import { useSettings } from "../../contexts/SettingsContext";

type ITagProps = {
  tag: ITag;
  variant?: string;
};

export default function Tag({ tag, variant }: ITagProps) {
  const {
    ui: {
      theme: {
        scheme: { actual: scheme },
      },
    },
  } = useSettings();

  return (
    <Popover withArrow>
      <Popover.Target>
        {tag.color ? (
          <Badge
            variant={variant || "light"}
            color={scheme === "dark" ? "dark.5" : "dark.7"}
            c={scheme === "dark" ? "dark.2" : "dark.3"}
            styles={{
              root: {
                border: "1px solid var(--mantine-color-dark-6)",
              },
            }}
          >
            {tag.name}
          </Badge>
        ) : (
          <Badge>{tag.name}</Badge>
        )}
      </Popover.Target>
      <Popover.Dropdown>{tag.description}</Popover.Dropdown>
    </Popover>
  );
}
