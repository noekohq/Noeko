import { Group, MantineColor, Text } from "@mantine/core";
import styles from "./PaperCard.module.scss";
import { Icon } from "@phosphor-icons/react";

interface IPaperCard {
  icon?: Icon;
  title: string;
  children: React.ReactNode | React.ReactNode[];
  bg?: MantineColor | string;
  onClick?: () => void;
}

export default function PaperCard({ title, icon, children, bg, onClick }: IPaperCard) {
  const Icon = icon;

  return (
    <div className={styles.paperCard} style={{ backgroundColor: bg }} onClick={onClick}>
      <div className={styles.title}>
        {Icon && <Icon weight="bold" />}
        {title}
      </div>

      <div
        className={styles.content}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {Array.isArray(children)
          ? children.map((child, index) => <div key={index}>{child}</div>)
          : children}
      </div>
    </div>
  );
}
