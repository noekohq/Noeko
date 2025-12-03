import React from "react";
import { Icon, IconProps } from "@phosphor-icons/react";
import styles from "./TypeLabel.module.scss";

interface ITypeLabelProps {
  label: React.ReactElement<IconProps>;
}

export default function TypeLabel({ label }: ITypeLabelProps) {
  return (
    <div className={styles.typeLabel}>
      {React.cloneElement(label, {
        size: 9,
        weight: "bold",
      })}
    </div>
  );
}
