import { DoorOpenIcon, IconProps } from "@phosphor-icons/react";
import { ITag } from "../../../../../app/database/models/tag";
import { IIdea } from "../../Ideas/IdeaCardTypes";
import TagCard from "../../Tags/TagCard";
import TaskCard from "../../Tasks/TaskCard";
import { ITask } from "../../../../../app/database/models/task";
import { MantineColor } from "@mantine/core";
import { ISource } from "../../../../../app/database/models/source";
import SourceCard from "../../Sources/SourceCard";
import { IConnectable } from "../../../../../app/services/Graph";
import IdeaButton from "../../Ideas/Interactions/IdeaButton";
import TaskButton from "../../Tasks/TaskButton";

interface IConnectableThingAction {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, connectable: IConnectable) => void;
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

interface IConnectableThingProps {
  thing: IConnectable;
  connectable: IConnectable;
  actions?: IConnectableThingAction[];
  connected?: boolean;
}

export default function ConnectableThing({
  thing,
  actions,
  connectable,
  connected,
}: IConnectableThingProps) {
  if (thing.id.toString().startsWith("idea")) {
    const idea = thing as IIdea;
    return <IdeaButton key={idea.id.toString()} idea={idea} />;
  }
  if (thing.id.toString().startsWith("task")) {
    return <TaskButton key={thing.id.toString()} task={thing as ITask} />;
  }
  if (thing.id.toString().startsWith("source")) {
    const source = thing as ISource;
    return <SourceCard key={source.id.toString()} source={source} />;
  }
}
