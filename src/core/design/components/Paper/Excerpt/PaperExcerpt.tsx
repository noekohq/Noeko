import { IExcerpt } from "@/domains/knowledge";
import styles from "./PaperExcerpt.module.scss";

interface IPaperExcerptProps {
  excerpt: IExcerpt;
  renderFull?: boolean;
  onClick: (excerpt: IExcerpt) => void;
}

export default function PaperExcerpt({ excerpt, onClick, renderFull = false }: IPaperExcerptProps) {
  return (
    <div
      className={`${styles.paperExcerpt} ${!renderFull ? styles.clamped : ""}`}
      onClick={() => {
        onClick(excerpt);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onClick(excerpt);
        }
      }}
      tabIndex={0}
    >
      <div className={styles.quote}>"{excerpt.sourceText}"</div>
      {excerpt.note && <p className={styles.note}>{excerpt.note}</p>}
    </div>
  );
}
