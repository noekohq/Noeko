import { ActionIcon, Box, Button, Group, Stack, Text } from "@mantine/core";
import {
  IExcerptNode,
  IIdeaNode,
  INode,
  ISourceNode,
  ITaskNode,
} from '@/declarations/graph';
import styles from "./GraphOrganizer.module.scss";
import { getNodeOrganizationType } from '@/utils/graph';
import RabbitholeButton from "../../Rabbitholes/RabbitholeButton";
import CollapseButton from '@core/design/components/Interactions/CollapseButton';
import { RabbitholeDropzone } from "../../Rabbitholes/RabbitholeDropzone";
import TagButton from "../../Tags/TagButton";
import ConnectableThing from "../Connections/ConnectableThing";
import { useGraph } from '@/contexts/GraphContext';
import { SelectionIcon } from "@phosphor-icons/react";
import { getThingPropsFromConnectable } from '@core/design/components/Paper/Things/thingUtils';
import PaperThing from '@core/design/components/Paper/Things/PaperThing';
import PaperTag from '@core/design/components/Paper/Tags/PaperTag';

interface IGraphOrganizerProps {
  nodes: INode[];
}

export function GraphOrganizer({ nodes }: IGraphOrganizerProps) {
  const {
    focused: { get: focused, set: setFocused },
    selected: { get: selection, clear: clearSelection, add: addToSelection, empty: selectionEmpty },
  } = useGraph();

  const selectedNodes = nodes.filter((node) => {
    return selection.has(node.id.toString());
  });

  const rabbitholes = selectedNodes.filter((node) => node.type === "rabbithole");
  const tags = selectedNodes.filter((node) => node.type === "tag");
  const connectables = selectedNodes.filter(
    (node) => getNodeOrganizationType(node) === "connectable"
  ) as (IIdeaNode | ISourceNode | ITaskNode | IExcerptNode)[];

  return (
    <div className={styles.organizer}>
      <Stack gap="xs">
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
        <Group wrap="wrap" gap="xs">
          {tags.map((tag) => {
            return (
              <PaperTag
                key={tag.id.toString()}
                tag={tag}
                state="applied"
                onClick={() => {
                  setFocused(tag.id.toString());
                }}
              />
            );
          })}
        </Group>
        {connectables.map((connectable) => {
          const props = getThingPropsFromConnectable(connectable, {}, true);
          return (
            <PaperThing
              key={connectable.id.toString()}
              {...props}
              preventClickDefault
              onClick={(node) => {
                setFocused(node);
              }}
            />
          );
        })}
      </Stack>
    </div>
  );
}
