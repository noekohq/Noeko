import { useRef, useEffect, ReactNode } from "react";
import styles from "./Spotlight.module.scss";

type IOptionProps = {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  active: boolean;
  setActive: () => void;
  onClick: () => void;
};

export function Option({
  icon,
  title,
  description,
  active,
  setActive,
  onClick,
}: IOptionProps) {
  const optionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      optionRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <div
      ref={optionRef}
      className={`${styles.result} ${active ? styles.active : ""}`}
      onMouseEnter={setActive}
      onClick={onClick}
    >
      <div className={styles.content}>
        <div className={styles.icon}>{icon}</div>
        <div className={styles.title}>{title}</div>
      </div>
      {description && active && (
        <div className={styles.description}>{description}</div>
      )}
    </div>
  );
}
