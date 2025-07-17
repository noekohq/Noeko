import { useState } from "react";
import { IIdea } from "./IdeaCardTypes";
import styles from "./IdeaCollapse.module.scss";

interface IIdeaCollapseProps {
  idea: IIdea;
}

function IIdeaCollapse({ idea }: IIdeaCollapseProps) {
  const [opened, setOpened] = useState(false);

  return <div className={styles.ideaCollapse}></div>;
}
