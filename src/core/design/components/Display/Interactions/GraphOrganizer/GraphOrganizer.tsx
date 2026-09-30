import { Button, Group, Stack, Text } from "@mantine/core";
import {
  IExcerptNode,
  IGraphSummaryNode,
  IIdeaNode,
  INode,
  IRabbitholeNode,
  ISourceNode,
  ITagNode,
  ITaskNode,
} from "@/declarations/graph";
import styles from "./GraphOrganizer.module.scss";
import { getNodeOrganizationType } from "@infrastructure/graph/utils";
import RabbitholeButton from "@domains/rabbitholes/components/Rabbitholes/RabbitholeButton";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { SelectionIcon } from "@phosphor-icons/react";
import { getThingPropsFromConnectable } from "@core/design/components/Paper/Things/thingUtils";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import PaperTag from "@core/design/components/Paper/Tags/PaperTag";
import { Trans } from "@lingui/react/macro";
import {
  getNodeDescription,
  getNodeLink,
  isGraphSummaryNode,
  NodeIcon,
} from "@infrastructure/graph/utils";

interface IGraphOrganizerProps {
  nodes: INode[];
}

export function GraphOrganizer({ nodes }: IGraphOrganizerProps) {
  const {
    focused: { set: setFocused },
    selected: { get: selection, clear: clearSelection, empty: selectionEmpty },
  } = useGraph();

  const selectedNodes = nodes.filter((node) => {
    return selection.has(node.id.toString());
  });

  const rabbitholes = selectedNodes.filter(
    (node): node is IRabbitholeNode | IGraphSummaryNode => node.type === "rabbithole"
  );
  const tags = selectedNodes.filter(
    (node): node is ITagNode | IGraphSummaryNode => node.type === "tag"
  );
  const connectables = selectedNodes.filter(
    (node) => getNodeOrganizationType(node) === "connectable"
  );

  return (
    <div className={styles.organizer}>
      <Stack gap="xs">
        {!selectionEmpty() && (
          <Group justify="space-between" align="center">
            <Text size="sm" c="dark.4" fw="bold">
              <Group gap="xs" align="center">
                <SelectionIcon weight="bold" />
                <Trans>SELECTED</Trans>
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
              <Trans>Clear</Trans>
            </Button>
          </Group>
        )}
        {rabbitholes.map((rabbithole) => {
          if (isGraphSummaryNode(rabbithole)) {
            return (
              <PaperThing
                key={rabbithole.id.toString()}
                id={rabbithole.id.toString()}
                title={rabbithole.label}
                detail={rabbithole.description || ""}
                icon={NodeIcon(rabbithole)}
                link={getNodeLink(rabbithole)}
                preventClickDefault
                onClick={() => setFocused(rabbithole.id.toString())}
              />
            );
          }
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
            if (isGraphSummaryNode(tag)) {
              return (
                <PaperThing
                  key={tag.id.toString()}
                  id={tag.id.toString()}
                  title={tag.label}
                  detail={tag.description || ""}
                  icon={NodeIcon(tag)}
                  link={getNodeLink(tag)}
                  preventClickDefault
                  onClick={() => setFocused(tag.id.toString())}
                />
              );
            }
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
          if (isGraphSummaryNode(connectable)) {
            return (
              <PaperThing
                key={connectable.id.toString()}
                id={connectable.id.toString()}
                title={connectable.label}
                detail={getNodeDescription(connectable) || ""}
                icon={NodeIcon(connectable)}
                link={getNodeLink(connectable)}
                preventClickDefault
                onClick={(node) => {
                  setFocused(node);
                }}
              />
            );
          }
          const props = getThingPropsFromConnectable(
            connectable as IIdeaNode | ISourceNode | ITaskNode | IExcerptNode,
            {},
            true
          );
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
