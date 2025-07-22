import { IWidgetConfig } from "../index.d";

export default function Scratchpad() {
  return <div>This is the scratchpad</div>;
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
