import { DoorOpenIcon, IconProps } from "@phosphor-icons/react";
import { ITag } from "../../../../shared/types/tags";
import { IIdea } from "../Ideas/IdeaCardTypes";
import IdeaCard from "../Ideas/Interactions/IdeaCard";
import {
  IRabbithole,
  IRabbitholeIncludes,
} from "../../../../app/database/models/rabbithole";
import TagCard from "../Tags/TagCard";
import TaskCard from "../Tasks/TaskCard";
import { ITask } from "../../../../app/database/models/task";
import { MantineColor } from "@mantine/core";
import { ISource } from "../../../../app/database/models/source";
import SourceCard from "../Sources/SourceCard";

interface IRabbitholeThingAction {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, rabbithole: IRabbithole) => void;
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
}

interface IRabbitholeThingProps {
  thing: IRabbitholeIncludes;
  rabbithole: IRabbithole;
  handleRemove?: (thingId: string) => void;
  actions?: IRabbitholeThingAction[];
}

export default function RabbitholeThing({
  thing,
  rabbithole,
  handleRemove,
  actions,
}: IRabbitholeThingProps) {
  if (thing.id.toString().startsWith("idea")) {
    const idea = thing as IIdea;
    return (
      <IdeaCard
        key={idea.id.toString()}
        idea={idea}
        actions={[
          ...(handleRemove
            ? [
                {
                  icon: <DoorOpenIcon />,
                  id: "uninclude",
                  label: `Remove`,
                  onClick: () => {
                    handleRemove(thing.id.toString());
                  },
                  tooltip: `Uninclude ${idea?.title} from ${rabbithole?.name}`,
                  color: "dark.1",
                },
              ]
            : []),
        ]}
      />
    );
  }
  if (thing.id.toString().startsWith("tag")) {
    const tag = thing as ITag;
    return (
      <TagCard
        key={tag.id.toString()}
        tag={tag}
        actions={[
          ...(handleRemove
            ? [
                {
                  icon: <DoorOpenIcon />,
                  id: "uninclude",
                  label: `Uninclude`,
                  onClick: () => {
                    handleRemove(thing.id.toString());
                  },
                  tooltip: `Uninclude ${tag?.name} from ${rabbithole?.name}`,
                  color: "red",
                },
              ]
            : []),
        ]}
      />
    );
  }
  if (thing.id.toString().startsWith("task")) {
    return (
      <TaskCard
        key={thing.id.toString()}
        task={thing as ITask}
        actions={[
          ...(handleRemove
            ? [
                {
                  icon: <DoorOpenIcon />,
                  id: "uninclude",
                  label: `Uninclude`,
                  onClick: () => {
                    handleRemove(thing.id.toString());
                  },
                  tooltip: `Uninclude task from ${rabbithole?.name}`,
                  color: "red",
                },
              ]
            : []),
        ]}
      />
    );
  }
  if (thing.id.toString().startsWith("source")) {
    const source = thing as ISource;
    return (
      <SourceCard
        key={source.id.toString()}
        source={source}
        actions={[
          ...(handleRemove
            ? [
                {
                  icon: <DoorOpenIcon />,
                  id: "uninclude",
                  label: `Uninclude`,
                  onClick: () => {
                    handleRemove(source.id.toString());
                  },
                  tooltip: `Uninclude source from ${rabbithole?.name}`,
                  color: "red",
                },
              ]
            : []),
        ]}
      />
    );
  }
}
