import styles from "./CompoundButton.module.scss";

interface ICompoundButtonProps {
  children: React.ReactNode;
  auxilary: React.ReactNode;
  onClick?: () => void;
  onClickAuxiliary?: () => void;
}

export default function CompoundButton({
  children,
  auxilary,
  onClick,
  onClickAuxiliary,
}: ICompoundButtonProps) {
  return (
    <div className={styles.compoundButton}>
      <button className={styles.main} onClick={onClick}>
        {children}
      </button>
      <button className={styles.auxilary} onClick={onClickAuxiliary}>
        {auxilary}
      </button>
    </div>
  );
}
