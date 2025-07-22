import { IWidgetConfig } from "../index.d";

export default function Heatmap() {
  return <div>This is the heatmap</div>;
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
