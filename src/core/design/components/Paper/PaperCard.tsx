import { Group, MantineColor, Text } from "@mantine/core";
import styles from "./PaperCard.module.scss";
import { Icon } from "@phosphor-icons/react";

interface IPaperCard {
  icon?: Icon;
  title?: React.ReactNode;
  children: React.ReactNode | React.ReactNode[];
  bg?: MantineColor | string;
  onClick?: () => void;
  variant?: "default" | "danger" | "transparent";
}

export default function PaperCard({
  title,
  icon,
  children,
  bg,
  onClick,
  variant = "default",
}: IPaperCard) {
  const IconComponent = icon;

  const classNames = [styles.paperCard, styles[variant]].filter(Boolean).join(" ");

  return (
    <div className={classNames} style={bg ? { backgroundColor: bg } : undefined} onClick={onClick}>
      {title && (
        <div className={styles.title}>
          {IconComponent && <IconComponent weight="bold" />}
          {title}
        </div>
      )}

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
