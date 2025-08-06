import { INode } from "../declarations/graph";

export const nodeTypeToRoutePrefix: Record<INode["type"], string> = {
  idea: "idea",
  derived: "derived",
  file: "file",
  tag: "tags",
  rabbithole: "rabbithole",
};
