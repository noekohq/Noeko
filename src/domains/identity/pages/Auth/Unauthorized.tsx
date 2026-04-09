import { useSearchParams, useNavigate } from "react-router";
import styles from "./Unauthorized.module.scss";
import { HandPalmIcon, HouseIcon, ArrowUUpLeftIcon } from "@phosphor-icons/react";
import { Trans } from "@lingui/react/macro";

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
            <Trans>Access Denied</Trans>
          </h1>
        </div>

        <p className={styles.description}>
          {message || <Trans>You don't have permission to access this page.</Trans>}
        </p>

        <div className={styles.actions}>
          {canGoBack && (
            <button onClick={goBack} className={styles.secondaryButton}>
              <ArrowUUpLeftIcon weight="bold" />
              <Trans>Go Back</Trans>
            </button>
          )}
          <a href="/" className={styles.primaryButton}>
            <HouseIcon weight="bold" />
            <Trans>Return Home</Trans>
          </a>
        </div>
      </div>
    </div>
  );
}
