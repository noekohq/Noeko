import { TaskItem } from "@tiptap/extension-task-item";
import { wrappingInputRule, markInputRule } from "@tiptap/core";

// Regex to match the markdown syntax for a checkbox, e.g., "- [ ] "
// - `^\s*`: Matches any whitespace at the beginning of the line.
// - `([-+*])`: Captures the list marker (-, +, or *).
// - `\s*`: Matches any whitespace after the marker.
// - `(\[ \])`: Captures the checkbox syntax "[ ]".
// - `\s$`: Matches a final space, which triggers the rule.
export const taskItemInputRegex = /^\s*(\[ \])\s$/;

export const DreamTaskItem = TaskItem.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: taskItemInputRegex,
        type: this.type,
        getAttributes: () => ({ checked: false }),
      }),
    ];
  },
});
