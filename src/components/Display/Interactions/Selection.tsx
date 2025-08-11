import { CheckIcon, IconProps } from "@phosphor-icons/react";
import { useState } from "react";
import styles from "./Selection.module.scss";
import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

interface IOption {
  icon?: React.ReactElement<IconProps>;
  label: string;
  value: string;
}

interface ISelectionProps {
  name: string;
  icon?: React.ReactElement<IconProps>;
  options: IOption[];
  initialValue?: string;
  onSelect?: (value: string) => void;
}

export default function Selection({
  name,
  icon,
  options,
  initialValue,
  onSelect,
}: ISelectionProps) {
  const [value, setValue] = useState<string | null>(initialValue || null);

  const handleSelect = (value: string) => {
    setValue(value);
    onSelect?.(value);
  };

  const handleUnselect = (value: string) => {
    setValue(initialValue ?? null);
    onSelect?.(value);
  };

  const currentOption = options.find((option) => option.value === value);
  const [opened, { toggle, close }] = useDisclosure();

  const toggleSelect = (item: string) => {
    if (value === item) {
      handleUnselect(item);
    } else {
      handleSelect(item);
    }
    toggle();
  };
  console.log("Current option: ", currentOption);

  return (
    <div className={styles.selection}>
      <button className={styles.button} onClick={toggle}>
        {currentOption ? (
          <>
            {currentOption.icon && (
              <div className={styles.left}>{currentOption.icon}</div>
            )}
            {currentOption.label}
          </>
        ) : (
          <>
            {icon && <div className={styles.left}>{icon}</div>}
            {name}
          </>
        )}
      </button>
      {opened && (
        <div className={styles.options}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleSelect(option.value)}
              className={`${styles.option} ${option.value === value ? styles.active : ""}`}
            >
              <div className={styles.left}>{option.icon && option.icon}</div>
              {option.label}
              {option.value === value ? (
                <div className={styles.right}>
                  <CheckIcon />
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
