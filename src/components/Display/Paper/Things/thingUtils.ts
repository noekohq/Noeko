import { IConnectable } from "../../../../../app/services/Graph";
import {
  getNodeContent,
  getNodeDescription,
  getNodeLinkFromId,
  getNodeTitle,
  IconMap,
} from "../../../../utils/graph";
import { IPaperThingProps } from "./PaperThing";

export function getThingPropsFromConnectable(
  connectable: IConnectable,
  overrides?: Partial<IPaperThingProps>,
  eager?: boolean,
): IPaperThingProps {
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
    overrides?.preview ?? {
      content: getNodeContent(connectable) || "No content available.",
    };

  return {
    id,
    title,
    detail,
    icon,
    state,
    link,
    action,
    preview,
  } satisfies IPaperThingProps;
}
