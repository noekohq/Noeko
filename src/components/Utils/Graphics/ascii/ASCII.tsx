import styles from "./ASCII.module.scss";

interface IASCIIProps {
  children: React.ReactNode;
  className?: string;
}

export default function ASCII({ children, className }: IASCIIProps) {
  return (
    <div className={`${styles.ascii} ${className || ""}`} aria-hidden="true">
      <pre>{children}</pre>
    </div>
  );
}
