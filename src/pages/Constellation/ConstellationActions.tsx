import { useCallback } from "react";
import styles from "./ConstellationActions.module.scss";
import { IGraph } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { Button, Group } from "@mantine/core";
import Search from "../../components/Search/Search";
import { ISearchResult } from "../../../shared/types/search";

type IConstellationActionsProps = {
  graphData: IGraph;
};

export default function ConstellationActions({
  graphData,
}: IConstellationActionsProps) {
  const {
    selected: { add: addSelected, remove: removeSelected },
    focused: { set: setFocused },
  } = useGraph();

  const handleSelectAllResults = useCallback(
    (results: ISearchResult[]) => {
      if (results) {
        results.forEach((r) => {
          addSelected(r.id.toString());
        });
      }
    },
    [addSelected],
  );

  const handleDeselectAllResults = useCallback(
    (results: ISearchResult[]) => {
      if (results) {
        results.forEach((r) => {
          removeSelected(r.id.toString());
        });
      }
    },
    [removeSelected],
  );

  return (
    <div className={`${styles.ui}`}>
      <Search
        resultsHeader={(results) => {
          if (!results || results.length === 0) return null;
          return (
            <Group gap="xs" my="md">
              <Button
                onClick={() => handleSelectAllResults(results)}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                Select All
              </Button>
              <Button
                onClick={() => handleDeselectAllResults(results)}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                Deselect All
              </Button>
            </Group>
          );
        }}
        onResultClick={(node) => {
          setFocused(node.id.toString());
        }}
      />
    </div>
  );
}
