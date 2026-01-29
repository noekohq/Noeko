import { useSearchParams } from "react-router";
import styles from "./Unauthorized.module.scss";
import { HandPalmIcon, HouseIcon } from "@phosphor-icons/react";

export default function Unauthorized() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message");

  return (
    <div className={styles.unauthorizedContainer}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>
            <HandPalmIcon weight="bold" />
            Access Denied
          </h1>
        </div>

        <p className={styles.description}>
          {message || "You don't have permission to access this page."}
        </p>

        <div className={styles.actions}>
          <a href="/" className={styles.primaryButton}>
            <HouseIcon weight="bold" />
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
