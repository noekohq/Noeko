import GraphContainer from "@domains/constellation/components/Graph/Graph";
import { IWidgetConfig } from "../index.d";

export default function MiniGraph() {
  return (
    <div>
      <GraphContainer graph={{ nodes: [], edges: [] }} />
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
