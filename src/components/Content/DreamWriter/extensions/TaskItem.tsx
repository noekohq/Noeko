import { wrappingInputRule } from "@tiptap/core";
import { DreamTaskItemSchema } from "../../../../../shared/editing/tiptap/nodes/DreamTaskItem";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import contentStyles from "../Content.module.scss";
import {
  Check,
  CheckIcon,
  DotsSixVertical,
  DotsSixVerticalIcon,
} from "@phosphor-icons/react";
import React from "react";

export const taskItemInputRegex = /^\s*(\[ \])\s$/;

const TaskItemComponent = ({ node, updateAttributes, editor }) => {
  const isChecked = node.attrs.checked;

  return (
    <NodeViewWrapper
      as="li"
      className={contentStyles.taskItem}
      data-checked={isChecked}
    >
      <div contentEditable="false" className={contentStyles.nonEditable}>
        {/*<div className={contentStyles.controls}>*/}
        <div
          className={contentStyles.dragHandle}
          draggable="true"
          data-drag-handle
        >
          <DotsSixVerticalIcon size={16} weight="bold" />
        </div>
        <label>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) =>
              updateAttributes({ checked: event.target.checked })
            }
          />
          {isChecked && <CheckIcon size={12} weight="bold" color="white" />}
        </label>
        {/*</div>*/}
      </div>
      <NodeViewContent as="div" className={contentStyles.taskContent} />
    </NodeViewWrapper>
  );
};

export const DreamTaskItem = DreamTaskItemSchema.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: taskItemInputRegex,
        type: this.type,
        getAttributes: () => ({ checked: false }),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskItemComponent);
  },
});
