import { Badge, Popover } from "@mantine/core";
import { ITag } from "../../../app/database/models/tag";

type ITagProps = {
  tag: ITag;
  variant?: string;
};

export default function Tag({ tag, variant }: ITagProps) {
  return (
    <Popover withArrow>
      <Popover.Target>
        {tag.color ? (
          <Badge
            variant={variant || "light"}
            color={"dark.0"}
            styles={{
              root: {
                border: "1px solid var(--mantine-color-dark-4)",
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
