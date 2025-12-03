import { useState } from "react";
import styles from "./PaperSelect.module.scss";

// Define the shape of each option
export interface IPaperSelectOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

interface IPaperSelectProps {
  label?: string;
  data: IPaperSelectOption[];
  value: string | null; // The currently selected value
  onChange: (value: string) => void;
  fullWidth?: boolean;
}

export default function PaperSelect({
  label,
  data,
  value,
  onChange,
  fullWidth = false,
}: IPaperSelectProps) {
  return (
    <div className={styles.paperSelectWrapper}>
      {label && <label className={styles.label}>{label}</label>}

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
              onClick={() => onChange(option.value)}
              aria-pressed={isSelected}
            >
              {option.icon && (
                <div className={styles.itemIcon}>{option.icon}</div>
              )}
              <div className={styles.itemBody}>
                <div className={styles.itemLabel}>{option.label}</div>
                {option.description && (
                  <div className={styles.itemDescription}>
                    {option.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
