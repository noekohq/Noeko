import { useSearchParams, useNavigate } from "react-router";
import styles from "./Unauthorized.module.scss";
import {
  HandPalmIcon,
  HouseIcon,
  ArrowUUpLeftIcon,
} from "@phosphor-icons/react";

export default function Unauthorized() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get("message");

  const goBack = () => {
    navigate(-2);
  };

  const canGoBack = window.history.length > 2;

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
          {canGoBack && (
            <button onClick={goBack} className={styles.secondaryButton}>
              <ArrowUUpLeftIcon weight="bold" />
              Go Back
            </button>
          )}
          <a href="/" className={styles.primaryButton}>
            <HouseIcon weight="bold" />
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
