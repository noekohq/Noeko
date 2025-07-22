import { IWidgetConfig } from "../index.d";

export default function RabbitholeList() {
  return <div>Rabbithole list</div>;
}

export const config: IWidgetConfig = {
  columns: {
    default: 4,
    min: 4,
    max: 6,
  },
};
