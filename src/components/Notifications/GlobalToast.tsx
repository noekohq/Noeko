import React from "react";
import { useAlert } from "../../contexts/AlertContext";
import styles from "./GlobalToast.module.scss";
import { X } from "@phosphor-icons/react";

function GlobalToast() {
  const { alert, clearAlert } = useAlert();

  if (!alert.open) {
    return null;
  }

  return (
    <div className={`${styles.toast} ${styles["type-" + alert.type]}`}>
      <button className={styles.close} onClick={clearAlert}>
        <X weight="bold" />
      </button>
      <h3 className={styles.title}>{alert.title}</h3>
      <p className={styles.message}>{alert.message}</p>
    </div>
  );
}

export default GlobalToast;
