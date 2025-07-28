import { DoorOpenIcon } from "@phosphor-icons/react";
import { ITag } from "../../../../app/database/models/tag";
import { IIdea } from "../Ideas/IdeaCardTypes";
import IdeaCard from "../Ideas/Interactions/IdeaCard";
import { showNotification } from "@mantine/notifications";
import useRabbithole from "../../../hooks/useRabbithole";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { RecordId } from "surrealdb";
import { useState } from "react";
import { includeThingInRabbithole } from "../../../utils/rabbitholes";
import TagCard from "../Tags/TagCard";

interface IRabbitholeThingProps {
  thing: IIdea | ITag;
  rabbithole: IRabbithole;
  handleRemove?: (thingId: string) => void;
}

export default function RabbitholeThing({
  thing,
  rabbithole,
  handleRemove,
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
                  color: "gray",
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
}
