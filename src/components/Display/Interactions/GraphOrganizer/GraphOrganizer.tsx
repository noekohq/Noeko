import { ActionIcon, Box, Button, Group, Stack, Text } from "@mantine/core";
import {
  IExcerptNode,
  IIdeaNode,
  INode,
  ISourceNode,
  ITaskNode,
} from "../../../../declarations/graph";
import styles from "./GraphOrganizer.module.scss";
import { getNodeOrganizationType } from "../../../../utils/graph";
import RabbitholeButton from "../../Rabbitholes/RabbitholeButton";
import CollapseButton from "../CollapseButton";
import { RabbitholeDropzone } from "../../Rabbitholes/RabbitholeDropzone";
import TagButton from "../../Tags/TagButton";
import ConnectableThing from "../Connections/ConnectableThing";
import { useGraph } from "../../../../contexts/GraphContext";
import { SelectionIcon } from "@phosphor-icons/react";

interface IGraphOrganizerProps {
  nodes: INode[];
}

export function GraphOrganizer({ nodes }: IGraphOrganizerProps) {
  const {
    focused: { get: focused, set: setFocused },
    selected: {
      get: selection,
      clear: clearSelection,
      add: addToSelection,
      empty: selectionEmpty,
    },
  } = useGraph();

  const selectedNodes = nodes.filter((node) => {
    return selection.has(node.id.toString());
  });

  const rabbitholes = selectedNodes.filter(
    (node) => node.type === "rabbithole",
  );
  const tags = selectedNodes.filter((node) => node.type === "tag");
  const connectables = selectedNodes.filter(
    (node) => getNodeOrganizationType(node) === "connectable",
  ) as (IIdeaNode | ISourceNode | ITaskNode | IExcerptNode)[];

  return (
    <div className={styles.organizer}>
      <Stack>
        {!selectionEmpty() && (
          <Group justify="space-between" align="center">
            <Text size="sm" c="dark.4" fw="bold">
              <Group gap="xs" align="center">
                <SelectionIcon weight="bold" />
                SELECTED
              </Group>
            </Text>
            <Button
              color="gray"
              variant="light"
              radius="lg"
              size="xs"
              onClick={() => {
                clearSelection();
              }}
            >
              Clear
            </Button>
          </Group>
        )}
        {rabbitholes.map((rabbithole) => {
          return (
            <RabbitholeButton
              key={rabbithole.id.toString()}
              rabbithole={rabbithole}
              onClick={(node) => {
                setFocused(node.id.toString());
              }}
            />
          );
        })}
        {tags.map((tag) => {
          return (
            <TagButton
              key={tag.id.toString()}
              tag={tag}
              onClick={(node) => {
                setFocused(node.id.toString());
              }}
            />
          );
        })}
        {connectables.map((connectable) => {
          return (
            <ConnectableThing
              key={connectable.id.toString()}
              thing={connectable}
              onClick={(node) => {
                setFocused(node.id.toString());
              }}
            />
          );
        })}
      </Stack>
    </div>
  );
}
