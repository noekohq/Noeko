import { IconProps } from "@phosphor-icons/react";
import { IIdea } from "@domains/knowledge/components/Ideas/IdeaCardTypes";
import { ITask } from "@/domains/knowledge";
import { MantineColor } from "@mantine/core";
import { ISource } from "@/domains/knowledge";
import { IConnectable } from "../../../../../../../shared/types/constellation";
import IdeaButton from "@domains/knowledge/components/Ideas/Interactions/IdeaButton";
import TaskButton from "@domains/knowledge/components/Tasks/TaskButton";
import SourceButton from "@domains/knowledge/components/Sources/SourceButton";
import { IExcerpt } from "@/domains/knowledge";
import ExcerptButton from "@domains/knowledge/components/Excerpts/ExcerptButton";

interface IConnectableThingAction {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, connectable: IConnectable) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean; // If true, primarily for the overflow menu
}

interface IConnectableThingProps {
  thing: IConnectable;
  connectable?: IConnectable;
  actions?: IConnectableThingAction[];
  connected?: boolean;
  onClick?: (connectable: IConnectable) => void;
  link?: boolean;
}

export default function ConnectableThing({
  thing,
  actions,
  connectable,
  connected,
  onClick,
  link,
}: IConnectableThingProps) {
  const handleClick = (thing: IConnectable) => {
    onClick?.(thing);
  };

  if (thing.id.toString().startsWith("idea")) {
    const idea = thing as IIdea;
    return (
      <IdeaButton
        link={link}
        key={idea.id.toString()}
        idea={idea}
        onClick={() => {
          handleClick(thing);
        }}
      />
    );
  }
  if (thing.id.toString().startsWith("task")) {
    return (
      <TaskButton
        link={link}
        key={thing.id.toString()}
        task={thing as ITask}
        onClick={() => {
          handleClick(thing);
        }}
      />
    );
  }
  if (thing.id.toString().startsWith("source")) {
    const source = thing as ISource;
    return (
      <SourceButton
        link={link}
        key={source.id.toString()}
        source={source}
        onClick={() => {
          handleClick(thing);
        }}
      />
    );
  }
  if (thing.id.toString().startsWith("excerpt")) {
    const excerpt = thing as IExcerpt;
    return (
      <ExcerptButton
        link={link}
        key={excerpt.id.toString()}
        excerpt={excerpt}
        onClick={() => {
          handleClick(thing);
        }}
      />
    );
  }
}
