import { IRabbithole } from "../../../../../app/database/models/rabbithole";
import { IFriendUser } from "../../../../../shared/types/user";
import {
  IConnectable,
  ISharedConnectable,
} from "../../../../../app/services/Graph";
import { IAcceleratorItem } from "../../../../../app/services/Recommendations";
import { formatDateTime } from "../../../../utils/formatting";
import {
  getNodeContent,
  getNodeDescription,
  getNodeLinkFromId,
  getNodeTitle,
  IconMap,
} from "../../../../utils/graph";
import {
  acceleratorItemFieldResolvers,
  getAcceleratorItemFields,
} from "../../../../utils/recommendations/accelerator";
import { RabbitholeIcon } from "../../../Utils/Icons/Icons";
import { IPaperThingProps } from "./PaperThing";
import { IThing } from "./things";
import { UserIcon } from "@phosphor-icons/react";

export function getThingPropsFromConnectable(
  connectable: IConnectable | ISharedConnectable,
  overrides?: Partial<IPaperThingProps>,
  eager?: boolean,
): IThing | IPaperThingProps {
  const id = overrides?.id ?? connectable.id.toString();
  const title = (overrides?.title ?? getNodeTitle(connectable)) || "No Title";
  const detail =
    (overrides?.detail ?? getNodeDescription(connectable)) ||
    "No details available.";
  const icon = overrides?.icon ?? IconMap[connectable.type];
  const state = overrides?.state ?? "default";
  const link =
    overrides && Object.hasOwn(overrides, "link")
      ? overrides.link
      : eager
        ? getNodeLinkFromId(connectable.id)
        : undefined;
  const action = overrides?.action;
  const preview: IPaperThingProps["preview"] | undefined =
    overrides?.preview ??
    (getNodeContent(connectable) || "No content available.");

  // Check if item has author field (indicates shared item)
  let artifacts: IPaperThingProps["artifacts"] = overrides?.artifacts;
  if (!artifacts && "author" in connectable && connectable.author) {
    const { firstName, lastName } = connectable.author;
    const ownerName = `${firstName} ${lastName}`.trim();

    artifacts = [
      {
        icon: UserIcon,
        label: `Shared by ${ownerName}`,
      },
    ];
  }

  return {
    id,
    title,
    detail,
    icon,
    state,
    link,
    action,
    preview,
    artifacts,
    createdAt: connectable.createdAt.toString(),
    updatedAt: connectable.updatedAt.toString(),
    ...overrides,
  } satisfies IThing | IPaperThingProps;
}

export function getThingsFromConnectables(
  connectables: (IConnectable | ISharedConnectable)[],
  overrides?: Partial<IPaperThingProps>,
  eager?: boolean,
) {
  return connectables.map((connectable) =>
    getThingPropsFromConnectable(connectable, overrides, eager),
  );
}

export function getThingPropsFromRabbithole(
  rabbithole: IRabbithole,
  overrides?: Partial<IPaperThingProps>,
): IPaperThingProps {
  const { id, name, updatedAt, createdAt } = rabbithole;

  return {
    id: overrides?.id ?? id.toString(),
    title: overrides?.title ?? name,
    detail:
      overrides?.detail ??
      `Updated ${formatDateTime(updatedAt)}, Created ${formatDateTime(createdAt)}`,
    icon: overrides?.icon ?? RabbitholeIcon,
    state: overrides?.state ?? "default",
    link: overrides?.link ?? `/rabbitholes/${id.toString()}`,
    action: overrides?.action,
    preview: overrides?.preview,
    createdAt: rabbithole.createdAt.toString(),
    updatedAt: rabbithole.updatedAt.toString(),
  };
}

export function getThingPropsFromAcceleratorItem(
  item: IAcceleratorItem,
  overrides?: Partial<IPaperThingProps>,
): IPaperThingProps {
  const resolved = getAcceleratorItemFields(item);
  const { id, name, link, detail, icon, preview, createdAt, updatedAt } =
    resolved;
  const state = overrides?.state ?? "default";
  const action = overrides?.action;

  return {
    id,
    title: name,
    detail,
    icon,
    state,
    link,
    action,
    preview,
    createdAt,
    updatedAt,
  } satisfies IPaperThingProps;
}

export function getThingPropsFromFriendUser(
  user: IFriendUser,
  overrides?: Partial<IPaperThingProps>,
): IPaperThingProps {
  const { id, firstName, lastName, email } = user;
  const fullName = `${firstName} ${lastName}`.trim() || email;

  return {
    id: id.toString(),
    title: fullName,
    detail: email,
    icon: UserIcon,
    state: overrides?.state ?? "default",
    createdAt: user.createdAt.toString(),
    updatedAt: user.createdAt.toString(),
    ...overrides,
  };
}
