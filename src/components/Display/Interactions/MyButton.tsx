import { UserIcon } from "@phosphor-icons/react";
import styles from "./MyButton.module.scss";
import { useDisclosure } from "@mantine/hooks";

export default function MyButton() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <button className={`${styles.myButton} ${opened ? styles.opened : ""}`}>
      <UserIcon weight="regular" size={20} className={styles.icon} />
    </button>
  );
}
