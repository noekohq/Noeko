import { FallbackProps } from "react-error-boundary";
import styles from "./Error.module.scss";
import {
  WarningOctagonIcon,
  ArrowClockwiseIcon,
  HouseIcon,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { api } from "./server/api";

export default function Error({ error, resetErrorBoundary }: FallbackProps) {
  const err = error as any;
  useEffect(() => {
    api.post("/logs", {
      level: "error",
      message: err.message,
      context: {
        stack: err.stack,
      },
      source: "ErrorBoundary",
    });
  }, [err]);

  const subject = encodeURIComponent(
    `Error Report: ${err.message || "Unknown Error"}`,
  );
  const body = encodeURIComponent(
    `Error: ${err.message}\nStack: ${err.stack}`,
  );
  const mailtoLink = `mailto:support@noeko.app?subject=${subject}&body=${body}`;

  return (
    <div className={styles.errorContainer}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>
            <WarningOctagonIcon weight="bold" />
            Hmm, something went wrong :/
          </h1>
        </div>

        <p className={styles.description}>
          You've found the error page. We've logged this, but for now let's get
          you back on track.
        </p>

        <div className={styles.actions}>
          {/* 1. Try Again (Retries the component render) */}
          <button onClick={resetErrorBoundary} className={styles.primaryButton}>
            <ArrowClockwiseIcon weight="bold" />
            Try Again
          </button>

          {/* 2. Go Home (Hard Refresh - Clears bad state) */}
          <a href="/" className={styles.secondaryButton}>
            <HouseIcon weight="bold" />
            Return Home
          </a>
        </div>

        {/* 3. Low-priority support link to reduce visual noise */}
        <div className={styles.footer}>
          Still stuck? <a href={mailtoLink}>Email Support</a> or ask on{" "}
          <a href="https://discord.gg/TY9sna9ZbT">Discord</a>.
          <details className={styles.details}>
            <summary>Show Error Details</summary>
            <pre>{err.message}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
