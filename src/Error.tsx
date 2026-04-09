import { FallbackProps } from "react-error-boundary";
import styles from "./Error.module.scss";
import { WarningOctagonIcon, ArrowClockwiseIcon, HouseIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { api } from "@infrastructure/api/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";

export default function Error({ error, resetErrorBoundary }: FallbackProps) {
  const { i18n } = useLingui();
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
    i18n._(t`Error Report: ${err.message || i18n._(t`Unknown Error`)}`)
  );
  const body = encodeURIComponent(i18n._(t`Error: ${err.message}\nStack: ${err.stack}`));
  const mailtoLink = `mailto:support@noeko.app?subject=${subject}&body=${body}`;

  return (
    <div className={styles.errorContainer}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>
            <WarningOctagonIcon weight="bold" />
            <Trans>Hmm, something went wrong :/</Trans>
          </h1>
        </div>

        <p className={styles.description}>
          <Trans>
            You've found the error page. We've logged this, but for now let's get you back on track.
          </Trans>
        </p>

        <div className={styles.actions}>
          {/* 1. Try Again (Retries the component render) */}
          <button onClick={resetErrorBoundary} className={styles.primaryButton}>
            <ArrowClockwiseIcon weight="bold" />
            <Trans>Try Again</Trans>
          </button>

          {/* 2. Go Home (Hard Refresh - Clears bad state) */}
          <a href="/" className={styles.secondaryButton}>
            <HouseIcon weight="bold" />
            <Trans>Return Home</Trans>
          </a>
        </div>

        {/* 3. Low-priority support link to reduce visual noise */}
        <div className={styles.footer}>
          <Trans>Still stuck?</Trans>{" "}
          <a href={mailtoLink}>
            <Trans>Email Support</Trans>
          </a>{" "}
          <Trans>or ask on</Trans>{" "}
          <a href="https://discord.gg/TY9sna9ZbT">
            <Trans>Discord</Trans>
          </a>
          .
          <details className={styles.details}>
            <summary>
              <Trans>Show Error Details</Trans>
            </summary>
            <pre>{err.message}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
