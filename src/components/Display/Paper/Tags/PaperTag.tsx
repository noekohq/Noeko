import { CheckIcon } from "@phosphor-icons/react";
import styles from "./PaperTag.module.scss";
import { ITag } from "../../../../../app/database/models/tag";
import { IConnectable } from "../../../../../app/services/Graph";
import useConnectable from "../../../../hooks/useConnectable";

export type ITagState = "applied" | "suggested" | "display";

interface IPaperTagProps {
  onClick?: () => void;
  active?: boolean;
  tag?: ITag;
  onRemove?: (tagId: string) => void;
  onApply?: (tagId: string) => void;
  state: ITagState;
}

export default function PaperTag({
  onClick,
  active = false,
  tag,
  onRemove,
  onApply,
  state,
}: IPaperTagProps) {
  const handleClick = () => {
    if (!tag) return;
    if (active && onRemove) {
      onRemove(tag.id.toString());
    } else if (onApply) {
      onApply(tag.id.toString());
    }
  };

  const classNames = [
    styles.paperTag,
    active && styles.active,
    state === "applied" && styles.applied,
    state === "suggested" && styles.suggested,
  ].filter(Boolean);

  return (
    <button className={classNames.join(" ")} onClick={handleClick}>
      {active && <CheckIcon weight="bold" />}
      {tag?.name}
    </button>
  );
}
