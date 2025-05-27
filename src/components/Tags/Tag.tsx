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
          <Badge variant={variant || "light"} color={tag.color}>
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
