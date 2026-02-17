import { InputHTMLAttributes, ReactNode } from "react";
import styles from "./PaperInput.module.scss";

interface IPaperInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftSection?: ReactNode;
}

export default function PaperInput({ leftSection, className, ...props }: IPaperInputProps) {
  return (
    <div className={`${styles.inputContainer} ${className}`}>
      {leftSection && <div className={styles.icon}>{leftSection}</div>}
      <input {...props} className={styles.input} />
    </div>
  );
}
