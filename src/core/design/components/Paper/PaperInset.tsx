import styles from "./PaperInset.module.scss";

interface IPaperInsetProps {
  children: React.ReactNode;
  padding?: "xs" | "sm" | "md";
}

export default function PaperInset({ children, padding = "sm" }: IPaperInsetProps) {
  const classNames = [styles.paperInset, styles[padding]].join(" ");

  return <div className={classNames}>{children}</div>;
}
