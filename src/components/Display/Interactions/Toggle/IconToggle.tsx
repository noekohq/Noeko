import styles from "./IconToggle.module.scss";
import { useToggle } from "@mantine/hooks";
import { IconProps } from "@phosphor-icons/react";

type IIconToggleOption = {
  icon: React.ReactElement<IconProps>;
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
        return (
          <button
            onClick={() => {
              onChange?.(option.value);
            }}
            className={`${styles.option} ${value === option.value ? styles.active : ""}`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
