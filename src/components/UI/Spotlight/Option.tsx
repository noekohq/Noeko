import { useRef, useEffect, ReactNode, useState } from "react";
import styles from "./Spotlight.module.scss";

type IOptionProps = {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  active: boolean;
  setActive: () => void;
  onClick: () => void;
  inSubview: boolean;
};

export function Option({
  icon,
  title,
  description,
  active,
  setActive,
  onClick,
  inSubview,
}: IOptionProps) {
  const optionRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (active) {
      optionRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <div
      ref={optionRef}
      className={`${styles.result} ${active ? styles.active : ""} ${hovering ? styles.hovering : ""} ${inSubview ? styles.inSubview : ""}`}
      onMouseDown={setActive}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
    >
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.icon}>{icon}</div>
      </div>
      {description && active && (
        <div className={styles.description}>{description}</div>
      )}
    </div>
  );
}
