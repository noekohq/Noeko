import React from "react";
import { Text } from "@mantine/core";
import { INode } from "../../../../declarations/graph";
import styles from "./PaperSearchResult.module.scss";
import Match from "../../../Utils/Match";
import { IconMap, TypeIcon } from "../../../../utils/graph";
import { QuestionMarkIcon } from "@phosphor-icons/react";

interface IPaperSearchResult {
  node: INode;
  title: string;
  snippet: string;
  onSelect?: (node: INode) => void;
}

export default function PaperSearchResult({
  node,
  title,
  snippet,
  onSelect,
}: IPaperSearchResult) {
  const handleOnSelect = () => {
    onSelect?.(node);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      handleOnSelect();
    }
  };

  const IconComponent = node.type ? IconMap[node.type] : QuestionMarkIcon;

  return (
    <div
      className={styles.paperSearchResult}
      onClick={handleOnSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      {/* Left: Icon Anchor */}
      <div className={styles.iconZone}>
        <IconComponent size={18} weight="bold" />
      </div>

      {/* Right: Stacked Content */}
      <div className={styles.contentWrapper}>
        {/* Row 1: Title (Full Width) */}
        <div className={styles.header}>
          <Text className={styles.title} truncate lineClamp={1}>
            {title}
          </Text>
        </div>

        {/* Row 2: Snippet */}
        <div className={styles.snippet}>
          <Text
            size="xs"
            c="dimmed"
            truncate="end"
            lineClamp={2}
            style={{ lineHeight: 1.4 }}
          >
            <Match
              opener="->"
              closer="<-"
              match={(text) => (
                <Text
                  component="span"
                  fw="bold"
                  c="highlight.7"
                  bg="highlight.1"
                  style={{ borderRadius: "2px", padding: "0 2px" }}
                >
                  {text}
                </Text>
              )}
            >
              {snippet}
            </Match>
          </Text>
        </div>
      </div>
    </div>
  );
}
