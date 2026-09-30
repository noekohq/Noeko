import { useMemo, useState } from "react";
import { showNotification } from "@mantine/notifications";
import { BinocularsIcon, LinkSimpleIcon, PathIcon, RabbitIcon } from "@phosphor-icons/react";
import type { IGraph } from "@/declarations/graph";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { TagPicker } from "@core/design/components/Display/Interactions/Tags/TagPicker";
import { ConnectionPicker } from "@core/design/components/Display/Interactions/Connections/ConnectionPicker";
import PaperButton from "@core/design/components/Paper/PaperButton";
import { applyTagToThing, createTag } from "@domains/knowledge/utils/tags";
import { connect, getNodeTitle } from "@infrastructure/graph/utils";
import { includeThingsInRabbithole, newRabbithole } from "@domains/rabbitholes/utils/rabbitholes";
import { useNavigate } from "react-router";
import type { ITag } from "../../../../../shared/types/tags";
import {
  createSelectionHandoff,
  isKnowledgeRefType,
  useWorkflowSelection,
} from "@core/interactions";
import styles from "./ConstellationSidebar.module.scss";

const CONNECTABLE_TYPES = new Set(["idea", "source", "task", "excerpt"]);
const INCLUDABLE_TYPES = new Set([...CONNECTABLE_TYPES, "tag"]);

async function settleInBatches<T>(items: T[], operation: (item: T) => Promise<unknown>) {
  const failures: T[] = [];
  for (let index = 0; index < items.length; index += 4) {
    const batch = items.slice(index, index + 4);
    const outcomes = await Promise.allSettled(batch.map(operation));
    outcomes.forEach((outcome, outcomeIndex) => {
      if (outcome.status === "rejected" || outcome.value === false || outcome.value === undefined) {
        failures.push(batch[outcomeIndex]);
      }
    });
  }
  return failures;
}

type WorkingSetActionsProps = {
  graph: IGraph;
  onTrace?: () => void;
  onMutationComplete?: () => void | Promise<unknown>;
  onActionComplete?: () => void;
  compact?: boolean;
};

export function WorkingSetActions({
  graph,
  onTrace,
  onMutationComplete,
  onActionComplete,
  compact = false,
}: WorkingSetActionsProps) {
  const navigate = useNavigate();
  const workflowSelection = useWorkflowSelection();
  const [creatingRabbithole, setCreatingRabbithole] = useState(false);
  const [connectingPair, setConnectingPair] = useState(false);
  const {
    selected: { get: selected },
    focused: { set: setFocused },
  } = useGraph();
  const selectedNodes = useMemo(
    () => graph.nodes.filter((node) => selected.has(node.id.toString())),
    [graph.nodes, selected]
  );
  const taggable = selectedNodes.filter((node) => CONNECTABLE_TYPES.has(node.type));
  const connectable = selectedNodes.filter((node) => CONNECTABLE_TYPES.has(node.type));
  const includable = selectedNodes.filter((node) => INCLUDABLE_TYPES.has(node.type));
  const spyglassItems = selectedNodes.flatMap((node) =>
    isKnowledgeRefType(node.type) ? [{ id: node.id.toString(), type: node.type }] : []
  );

  const exploreInSpyglass = () => {
    if (spyglassItems.length === 0) return;
    const handoff = createSelectionHandoff({
      items: spyglassItems,
      origin: {
        surface: "constellation-working-set",
        label: "Constellation Working Set",
      },
    });
    workflowSelection.replace(handoff);
    navigate(`/spyglass?selection=${handoff.updatedAt}`);
  };

  const reportBulkResult = async (
    action: string,
    total: number,
    failures: typeof selectedNodes,
    successMessage?: string
  ) => {
    const succeeded = total - failures.length;
    const failedNames = failures.map((node) => getNodeTitle(node) || node.id.toString());
    const failureSummary = failedNames.length
      ? ` Failed: ${failedNames.slice(0, 3).join(", ")}${failedNames.length > 3 ? ` and ${failedNames.length - 3} more` : ""}.`
      : "";
    showNotification({
      title: failures.length === 0 ? `${action} complete` : `${action} partially complete`,
      message:
        failures.length === 0
          ? successMessage || `${succeeded} ${succeeded === 1 ? "item was" : "items were"} updated.`
          : `${succeeded} succeeded and ${failures.length} failed. Your Working Set was preserved.${failureSummary}`,
      color: failures.length === 0 ? "green" : "yellow",
    });
    if (succeeded > 0) await onMutationComplete?.();
    return succeeded;
  };

  const applyTag = async (tag: ITag) => {
    const failures = await settleInBatches(taggable, (node) =>
      applyTagToThing(tag.id.toString(), node.id.toString())
    );
    const succeeded = await reportBulkResult(
      "Tagging",
      taggable.length,
      failures,
      `Applied “${tag.name}” to ${taggable.length} ${taggable.length === 1 ? "item" : "items"}.`
    );
    if (succeeded > 0) {
      setFocused(tag.id.toString());
      onActionComplete?.();
    }
  };

  const createAndApplyTag = async (name: string, description: string, color: string) => {
    const tag = await createTag(name, description, color);
    if (!tag) throw new Error("The tag could not be created.");
    await applyTag(tag);
  };

  const connectToAnchor = async (anchorId: string) => {
    const sources = connectable.filter((node) => node.id.toString() !== anchorId);
    const failures = await settleInBatches(sources, (node) =>
      connect(node.id.toString(), anchorId)
    );
    const anchor = graph.nodes.find((node) => node.id.toString() === anchorId);
    const anchorTitle = anchor ? getNodeTitle(anchor) : undefined;
    const succeeded = await reportBulkResult(
      "Connection",
      sources.length,
      failures,
      `${sources.length} ${sources.length === 1 ? "item was" : "items were"} connected to ${anchorTitle ? `“${anchorTitle}”` : "the new anchor"}.`
    );
    if (succeeded > 0) {
      setFocused(anchorId);
      onActionComplete?.();
    }
  };

  const connectPair = async () => {
    if (selectedNodes.length !== 2 || connectable.length !== 2 || connectingPair) return;
    setConnectingPair(true);
    try {
      await connectToAnchor(connectable[1].id.toString());
    } finally {
      setConnectingPair(false);
    }
  };

  const createRabbithole = async () => {
    if (includable.length === 0 || creatingRabbithole) return;
    setCreatingRabbithole(true);
    try {
      const rabbithole = await newRabbithole();
      if (!rabbithole) throw new Error("The Rabbithole could not be created.");
      await includeThingsInRabbithole(
        rabbithole.id.toString(),
        includable.map((node) => node.id.toString())
      );
      navigate(`/rabbitholes/${rabbithole.id.toString()}`);
    } catch (error) {
      console.error("Unable to create a Rabbithole from the Working Set", error);
      showNotification({
        title: "Could not create Rabbithole",
        message: "Your Working Set is still selected. Please try again.",
        color: "red",
      });
    } finally {
      setCreatingRabbithole(false);
    }
  };

  return (
    <div className={`${styles.workingSetActions} ${compact ? styles.compactActions : ""}`}>
      <TagPicker
        triggerLabel="Tag All"
        fullWidth
        onSelectExisting={applyTag}
        onCreateNew={createAndApplyTag}
      />
      {selectedNodes.length === 2 && connectable.length === 2 ? (
        <PaperButton
          size="md"
          withBorder
          fullWidth
          loading={connectingPair}
          onClick={connectPair}
          leftSection={<LinkSimpleIcon aria-hidden weight="bold" />}
        >
          Connect 2 Selected Items
        </PaperButton>
      ) : selectedNodes.length > 2 && connectable.length >= 2 ? (
        <ConnectionPicker
          triggerLabel={`Connect ${connectable.length} to Anchor`}
          helperText={`Choose one anchor for all ${connectable.length} compatible selected items, or type a title to create a new connected idea.`}
          fullWidth
          onSelect={connectToAnchor}
          initialSuggestions={connectable}
        />
      ) : (
        <PaperButton
          size="md"
          withBorder
          fullWidth
          disabled
          leftSection={<LinkSimpleIcon aria-hidden weight="bold" />}
        >
          Connect to Anchor
        </PaperButton>
      )}
      <PaperButton
        size="md"
        withBorder
        fullWidth
        disabled={selectedNodes.length < 2 || !onTrace}
        onClick={onTrace}
        leftSection={<PathIcon aria-hidden weight="bold" />}
      >
        Trace selection
      </PaperButton>
      <PaperButton
        size="md"
        withBorder
        fullWidth
        disabled={spyglassItems.length === 0}
        onClick={exploreInSpyglass}
        leftSection={<BinocularsIcon aria-hidden weight="bold" />}
      >
        Ask Spyglass
      </PaperButton>
      <PaperButton
        size="md"
        withBorder
        fullWidth
        disabled={includable.length === 0}
        loading={creatingRabbithole}
        onClick={createRabbithole}
        leftSection={<RabbitIcon aria-hidden weight="bold" />}
      >
        Create Rabbithole
      </PaperButton>
    </div>
  );
}
