import { Collapse } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import styles from "./CollapseButton.module.scss";

interface ICollapseButton {
  target: React.ReactNode;
  details: React.ReactNode;
}

export default function CollapseButton({ target, details }: ICollapseButton) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <div className={`${styles.collapseButton} ${opened ? styles.opened : ""}`}>
      <div
        onClick={() => {
          toggle();
        }}
        className={styles.target}
      >
        {target}
      </div>
      <Collapse in={opened}>{details}</Collapse>
    </div>
  );
}
