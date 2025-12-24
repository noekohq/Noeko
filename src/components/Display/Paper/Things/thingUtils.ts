import { IRabbithole } from "../../../../../app/database/models/rabbithole";
import { IConnectable } from "../../../../../app/services/Graph";
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

export function getThingPropsFromConnectable(
  connectable: IConnectable,
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
  const link = overrides?.link
    ? overrides.link
    : eager
      ? getNodeLinkFromId(connectable.id)
      : undefined;
  const action = overrides?.action;
  const preview: IPaperThingProps["preview"] | undefined =
    overrides?.preview ??
    (getNodeContent(connectable) || "No content available.");
  return {
    id,
    title,
    detail,
    icon,
    state,
    link,
    action,
    preview,
    createdAt: connectable.createdAt.toString(),
    updatedAt: connectable.updatedAt.toString(),
  } satisfies IThing | IPaperThingProps;
}

export function getThingsFromConnectables(
  connectables: IConnectable[],
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
