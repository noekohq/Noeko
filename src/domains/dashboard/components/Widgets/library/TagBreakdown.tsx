import { useEffect, useState } from "react";
import { ITagBreakdown } from "../../../../../../app/services/Analysis";
import useFetch from "@core/hooks/useFetch";
import { IWidgetConfig } from "../index.d";
import styles from "./TagBreakdown.module.scss";
import {
  ActionIcon,
  Button,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import TagCard from "@domains/knowledge/components/Tags/TagCard";
import TagButton from "@domains/knowledge/components/Tags/TagButton";
import { Link } from "react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useInteraction } from "@/contexts/InteractionContext";

export default function TagBreakdown() {
  const {
    data: tagBreakdown,
    load: loadBreakdown,
    loading: loadingBreakdown,
  } = useFetch<undefined, ITagBreakdown>({
    url: "/analysis/tag-breakdown",
  });

  useEffect(() => {
    loadBreakdown();
  }, []);

  const mostUsed = tagBreakdown?.mostUsed ?? [];
  const mostRelevant = tagBreakdown?.semanticallyCentral ?? [];
  const combinedRaw = [...mostUsed, ...mostRelevant];
  const combined = combinedRaw.filter((tag) => combinedRaw.find((t) => t.id === tag.id));

  const [viewMode, setViewMode] = useState<"combined" | "mostUsed" | "mostRelevant">("mostUsed");

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

  if (loadingBreakdown) {
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
            <Group align="center" gap="xs">
              You have {(tagBreakdown?.total ?? 0 > 0) ? tagBreakdown?.total : "no"} tag
              {tagBreakdown?.total === 1 ? "" : "s"}.{" "}
              <Link to="/tags">
                <ActionIcon variant="light" color="gray" size="xs">
                  <ArrowRightIcon weight="bold" size={14} />
                </ActionIcon>
              </Link>
            </Group>
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
        {!toView().length && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              No tags to see.
            </Text>
          </Group>
        )}
        <SimpleGrid
          cols={{
            sm: 1,
            md: 2,
          }}
        >
          {toView().map((tag) => {
            return <TagButton key={tag.id.toString()} tag={tag} />;
          })}
        </SimpleGrid>
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
