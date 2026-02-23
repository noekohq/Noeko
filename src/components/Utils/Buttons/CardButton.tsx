import { useNavigate } from "react-router";
import { ITask } from '../../../../app/database/models/task';
import styles from "./CardButton.module.scss";

interface ICardButton {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function CardButton({ children, onClick }: ICardButton) {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <div
      role="button"
      onClick={() => {
        handleClick();
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleClick();
        }
      }}
      className={styles.cardButton}
      draggable={true}
    >
      {children}
    </div>
  );
}
