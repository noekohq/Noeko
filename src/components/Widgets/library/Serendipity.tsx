import styles from "./Serendipity.module.scss";
import { IWidgetConfig } from "../index.d";

export default function Serendipity() {
  return <div>Serendipity</div>;
}

export const config: IWidgetConfig = {
  columns: {
    default: 4,
    min: 4,
    max: 6,
  },
};
