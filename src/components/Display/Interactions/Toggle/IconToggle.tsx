import styles from "./IconToggle.module.scss";
import { useToggle } from "@mantine/hooks";
import { Icon, IconProps } from "@phosphor-icons/react";
import React from "react";

type IIconToggleOption = {
  icon: Icon;
  value: string;
};

interface IIconToggleProps {
  options: IIconToggleOption[];
  value?: string;
  onChange?: (value: string) => void;
}

export default function IconToggle({
  options,
  value,
  onChange,
}: IIconToggleProps) {
  const handleClick = (option: string) => {
    onChange?.(option);
  };

  return (
    <div className={styles.iconToggle}>
      {options.map((option) => {
        const IconEl = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => {
              onChange?.(option.value);
            }}
            className={`${styles.option} ${value === option.value ? styles.active : ""}`}
          >
            <IconEl weight="bold" />
          </button>
        );
      })}
    </div>
  );
}
