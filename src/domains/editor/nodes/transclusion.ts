import { Editor } from "@tiptap/core";
import { Fragment, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { canJoin } from "@tiptap/pm/transform";
import {
  DreamTransclusionType,
  DreamTransclusionViewMode,
} from "../../../../shared/editing/tiptap/nodes/DreamTransclusion";

interface IConvertInlineNodeOptions {
  editor: Editor;
  getPos: () => number | undefined;
  node: ProseMirrorNode;
  connectableType: DreamTransclusionType;
  connectableId: string;
  label: string;
  viewMode: DreamTransclusionViewMode;
}

/**
 * Inline and block nodes cannot share a ProseMirror node type. Replace the
 * inline node's containing text block so content on either side remains valid.
 */
export const convertInlineNodeToTransclusion = ({
  editor,
  getPos,
  node,
  connectableType,
  connectableId,
  label,
  viewMode,
}: IConvertInlineNodeOptions) => {
  const pos = getPos();
  if (typeof pos !== "number" || !connectableId) return false;

  const { state, view } = editor;
  const $pos = state.doc.resolve(pos);
  if ($pos.depth === 0) return false;

  const parent = $pos.parent;
  const parentStart = $pos.before($pos.depth);
  const parentEnd = $pos.after($pos.depth);
  const inlineOffset = $pos.parentOffset;
  const before = parent.content.cut(0, inlineOffset);
  const after = parent.content.cut(inlineOffset + node.nodeSize, parent.content.size);
  const transclusion = state.schema.nodes.dreamTransclusion?.create({
    connectableType,
    connectableId,
    label,
    viewMode,
  });

  if (!transclusion) return false;

  const makeReplacement = (preserveEmptyLeadingBlock: boolean) => {
    const replacement: ProseMirrorNode[] = [];
    if (before.size || preserveEmptyLeadingBlock) replacement.push(parent.copy(before));
    replacement.push(transclusion);
    if (after.size) replacement.push(parent.copy(after));
    return replacement;
  };

  let replacement = makeReplacement(false);
  const grandparent = $pos.node($pos.depth - 1);
  const parentIndex = $pos.index($pos.depth - 1);

  if (!grandparent.canReplace(parentIndex, parentIndex + 1, Fragment.fromArray(replacement))) {
    replacement = makeReplacement(true);
  }

  if (!grandparent.canReplace(parentIndex, parentIndex + 1, Fragment.fromArray(replacement))) {
    return false;
  }

  const transaction = state.tr.replaceWith(parentStart, parentEnd, replacement);
  const transclusionPos =
    parentStart + (replacement[0] === transclusion ? 0 : replacement[0].nodeSize);
  transaction.setSelection(NodeSelection.create(transaction.doc, transclusionPos));
  view.dispatch(transaction);
  view.focus();
  return true;
};

export const getInlineNodeType = (connectableType: DreamTransclusionType) => {
  switch (connectableType) {
    case "idea":
      return { type: "dreamIdea", idAttribute: "ideaId" };
    case "task":
      return { type: "dreamTask", idAttribute: "taskId" };
    case "source":
      return { type: "dreamSource", idAttribute: "sourceId" };
  }
};

interface IConvertTransclusionToInlineOptions {
  editor: Editor;
  from: number;
  to: number;
  connectableType: DreamTransclusionType;
  connectableId: string;
  label: string;
}

export const convertTransclusionToInline = ({
  editor,
  from,
  to,
  connectableType,
  connectableId,
  label,
}: IConvertTransclusionToInlineOptions) => {
  const inlineNode = getInlineNodeType(connectableType);
  const content = label || "Untitled";
  const { state, view } = editor;
  const inlineNodeType = state.schema.nodes[inlineNode.type];
  const paragraphType = state.schema.nodes.paragraph;
  if (!inlineNodeType || !paragraphType) return false;

  const inline = inlineNodeType.create(
    { [inlineNode.idAttribute]: connectableId },
    state.schema.text(content)
  );
  const paragraph = paragraphType.create(null, inline);
  const transaction = state.tr.replaceWith(from, to, paragraph);
  let rightBoundary = from + paragraph.nodeSize;
  let cursorPosition = from + 1 + inline.nodeSize;

  // Undo the paragraph split created by inline -> block conversion whenever
  // compatible text blocks still sit immediately on either side.
  if (canJoin(transaction.doc, from)) {
    transaction.join(from);
    rightBoundary -= 2;
    cursorPosition -= 2;
  }
  if (canJoin(transaction.doc, rightBoundary)) {
    transaction.join(rightBoundary);
  }

  const safeCursorPosition = Math.min(Math.max(cursorPosition, 1), transaction.doc.content.size);
  transaction.setSelection(TextSelection.near(transaction.doc.resolve(safeCursorPosition), 1));
  view.dispatch(transaction);
  view.focus();
  return true;
};
