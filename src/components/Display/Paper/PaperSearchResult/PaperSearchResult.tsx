import React from "react"; // <-- Added for JSX
import { Text } from "@mantine/core";
import { useSearch } from "../../../../contexts/SearchContext";
import { INode } from "../../../../declarations/graph";
import styles from "./PaperSearchResult.module.scss";
import Match from "../../../Utils/Match";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { NodeIcon, TypeIcon } from "../../../../utils/graph";

interface IPaperSearchResult {
  node: INode;
  title: string;
  snippet: string;
  meta: string;
  onSelect?: (node: INode) => void;
}

export default function PaperSearchResult({
  node,
  title,
  snippet,
  meta,
  onSelect,
}: IPaperSearchResult) {
  const {
    global: { query },
  } = useSearch();

  const handleOnSelect = () => {
    onSelect?.(node);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      handleOnSelect();
    }
  };

  const Icon = node.type ? TypeIcon(node.type) : undefined;

  return (
    <div
      className={styles.paperSearchResult}
      onClick={handleOnSelect}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <Text size="sm" fw="bold" lineClamp={1} truncate>
            {title}
          </Text>
        </div>

        <div className={styles.content}>
          <Text size="sm" truncate={"end"} lineClamp={2}>
            <Match
              opener="->"
              closer="<-"
              match={(text) => (
                <Text component="span" fw="bold" c="highlight.7">
                  {text}
                </Text>
              )}
            >
              {snippet}
            </Match>
          </Text>
        </div>

        <div className={styles.meta}>
          {Icon && <Icon weight="bold" className={styles.icon} />}
          <Text size="sm" fs="italic">
            {meta}
          </Text>
        </div>
      </div>
      {/*{!!onSelect && (
        <div className={styles.action}>
          <ArrowRightIcon />
        </div>
      )}*/}
    </div>
  );
}
