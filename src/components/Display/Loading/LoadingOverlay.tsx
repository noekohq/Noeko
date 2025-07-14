import { Stack, Text, Transition } from "@mantine/core";
import Loading from "./Loading";
import styles from "./LoadingOverlay.module.scss";

interface ILoadingOverlayProps {
  loading: boolean;
  children?: React.ReactNode | React.ReactNode[];
}

export default function LoadingOverlay({
  loading,
  children,
}: ILoadingOverlayProps) {
  console.log("Visible");
  return (
    <div
      className={`${styles.overlay} ${loading ? styles.loading : styles.gone}`}
    >
      <div className={styles.content}>
        {children && children}
        {!children && (
          <Stack align="center">
            <Loading size="md" />
            <Text c="dimmed" size="sm">
              Loading...
            </Text>
          </Stack>
        )}
      </div>
    </div>
  );
}
