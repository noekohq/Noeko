import styles from "./Wrapper.module.scss";

interface IWidgetWrapperProps {
  children: React.ReactNode;
}

export default function WidgetWrapper({ children }: IWidgetWrapperProps) {
  return (
    <div className={styles.widgetWrapper}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
