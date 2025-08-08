import { useEffect, useState } from "react";
import { ITagBreakdown } from "../../../../app/services/Analysis";
import useFetch from "../../../hooks/useFetch";
import { IWidgetConfig } from "../index.d";
import styles from "./TagBreakdown.module.scss";
import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import TagCard from "../../Display/Tags/TagCard";

export default function TagBreakdown() {
  const { data: tagBreakdown, load: loadBreakdown } = useFetch<
    undefined,
    ITagBreakdown
  >({
    url: "/analysis/tag-breakdown",
  });

  useEffect(() => {
    loadBreakdown();
  }, []);

  const mostUsed = tagBreakdown?.mostUsed ?? [];
  const mostRelevant = tagBreakdown?.semanticallyCentral ?? [];
  const combinedRaw = [...mostUsed, ...mostRelevant];
  const combined = combinedRaw.filter((tag) =>
    combinedRaw.find((t) => t.id === tag.id),
  );

  const [viewMode, setViewMode] = useState<
    "combined" | "mostUsed" | "mostRelevant"
  >("mostUsed");

  const toView = () => {
    switch (viewMode) {
      case "combined":
        return combined;
      case "mostUsed":
        return mostUsed;
      case "mostRelevant":
        return mostRelevant;
      default:
        return [];
    }
  };

  if (!tagBreakdown) {
    return (
      <Text size="sm" c="dimmed" fw="bold">
        Loading...
      </Text>
    );
  }

  return (
    <div className={styles.tagBreakdown}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed" fw="bold">
            You have {tagBreakdown?.total} tag
            {tagBreakdown?.total === 1 ? "" : "s"}.
          </Text>
          <SegmentedControl
            value={viewMode}
            data={[
              { label: "Usage", value: "mostUsed" },
              { label: "Relevance", value: "mostRelevant" },
              { label: "Both", value: "combined" },
            ]}
            onChange={(v) => {
              setViewMode(v as "combined" | "mostUsed" | "mostRelevant");
            }}
            size="xs"
          />
        </Group>
        {toView().map((tag) => {
          return <TagCard key={tag.id.toString()} tag={tag} />;
        })}
      </Stack>
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
