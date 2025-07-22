import { IWidgetConfig } from "../index.d";
export default function TaskList() {
  return <div>This is the task list</div>;
}

export const config: IWidgetConfig = {
  columns: {
    default: 4,
    min: 4,
    max: 6,
  },
};
