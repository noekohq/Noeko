import { useState } from "react";
import styles from "./PaperSelect.module.scss";
import { Popover } from "@mantine/core";
import { CaretDown } from "@phosphor-icons/react";

// Define the shape of each option
export interface IPaperSelectOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

interface IPaperSelectProps {
  label?: string;
  placeholder?: string;
  data: IPaperSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  onClear?: () => void;
  fullWidth?: boolean;
}

export default function PaperSelect({
  label,
  placeholder,
  data,
  value,
  onChange,
  onClear,
  fullWidth = false,
}: IPaperSelectProps) {
  const [opened, setOpened] = useState(false);
  const selectedOption = data.find((item) => item.value === value);

  return (
    <div className={styles.paperSelectWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <Popover opened={opened} onChange={setOpened} shadow="md" withArrow arrowSize={10}>
        <Popover.Target>
          <button
            type="button"
            className={styles.targetButton}
            onClick={() => setOpened((o) => !o)}
            data-active={opened || !!selectedOption}
          >
            <div className={styles.targetLabel}>
              {selectedOption ? selectedOption.label : placeholder}
            </div>
            <CaretDown weight="bold" className={styles.targetChevron} />
          </button>
        </Popover.Target>

        <Popover.Dropdown className={styles.dropdown}>
          <div className={styles.optionsContainer}>
            {data.map((option) => {
              const isSelected = option.value === value;
              const classNames = [
                styles.paperSelectItem,
                isSelected ? styles.selected : "",
                fullWidth ? styles.fullWidth : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  type="button"
                  key={option.value}
                  className={classNames}
                  onClick={() => {
                    if (isSelected) {
                      onClear?.();
                    } else {
                      onChange(option.value);
                    }
                    setOpened(false);
                  }}
                  aria-pressed={isSelected}
                >
                  {option.icon && <div className={styles.itemIcon}>{option.icon}</div>}
                  <div className={styles.itemBody}>
                    <div className={styles.itemLabel}>{option.label}</div>
                    {option.description && (
                      <div className={styles.itemDescription}>{option.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
