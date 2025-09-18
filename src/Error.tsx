import { FallbackProps } from "react-error-boundary";
import styles from "./Error.module.scss";
import { WarningOctagonIcon } from "@phosphor-icons/react";

export default function Error({ error, resetErrorBoundary }: FallbackProps) {
  console.log("Error", error);

  return (
    <div className={styles.errorWrapper}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>
            <WarningOctagonIcon weight="bold" />
            Hmm, something went wrong :/
          </h1>
        </div>
        <p>
          You've found the error page, that means we have work to do! Please
          contact us at <a href="mailto:support@noeko.app">support@noeko.app</a>{" "}
          for assistance in clearing this up.
        </p>
      </div>
    </div>
  );
}
