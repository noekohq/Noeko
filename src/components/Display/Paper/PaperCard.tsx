import { Group, MantineColor, Text } from "@mantine/core";
import styles from "./PaperCard.module.scss";
import { Icon } from "@phosphor-icons/react";

interface IPaperCard {
  icon?: Icon;
  title: string;
  children: React.ReactNode | React.ReactNode[];
  bg?: MantineColor | string;
}

export default function PaperCard({ title, icon, children }: IPaperCard) {
  const Icon = icon;

  return (
    <div className={styles.paperCard}>
      <div className={styles.title}>
        {Icon && <Icon weight="bold" />}
        <Text fw="bold" c="dimmed" size="sm">
          {title}
        </Text>
      </div>

      <div className={styles.content}>
        {Array.isArray(children)
          ? children.map((child, index) => <div key={index}>{child}</div>)
          : children}
      </div>
    </div>
  );
}
