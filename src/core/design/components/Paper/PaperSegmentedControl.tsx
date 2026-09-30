import { SegmentedControl, SegmentedControlProps } from "@mantine/core";
import styles from "./PaperSegmentedControl.module.scss";

export default function PaperSegmentedControl({ className, ...props }: SegmentedControlProps) {
  return (
    <SegmentedControl
      {...props}
      className={[styles.control, className].filter(Boolean).join(" ")}
      classNames={{
        root: styles.root,
        indicator: styles.indicator,
        label: styles.label,
      }}
    />
  );
}
