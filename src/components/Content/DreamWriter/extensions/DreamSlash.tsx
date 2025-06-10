import { createRoot } from "react-dom/client";
import { Editor, Extension, Range } from "@tiptap/core";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionPluginKey,
  SuggestionProps,
} from "@tiptap/suggestion";

const suggestionKey = new PluginKey("dream-slash");

import SuggestionMenu from "./Components/SuggestionMenu";
import {
  TextTIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  CodeBlockIcon,
  SparkleIcon, // Generic icon placeholder
  CheckSquareIcon,
  TableIcon,
} from "@phosphor-icons/react";
import { PluginKey } from "@tiptap/pm/state";

// --- Type Definitions ---
export interface IDreamSlashOptions {
  // Placeholder for any future options, e.g., filtering commands
}

export interface IDreamSlashItem {
  id: string;
  title: string;
  description?: string;
  icon: JSX.Element;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

// --- Available Slash Commands ---
const DREAM_SLASH_ITEMS: IDreamSlashItem[] = [
  {
    id: "paragraph",
    title: "Paragraph",
    description: "Continue writing with normal text.",
    icon: <TextTIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("paragraph").run();
    },
  },
  {
    id: "heading1",
    title: "Heading 1",
    description: "Large section heading.",
    icon: <SparkleIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    id: "heading2",
    title: "Heading 2",
    description: "Medium section heading.",
    icon: <SparkleIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    id: "heading3",
    title: "Heading 3",
    description: "Small section heading.",
    icon: <SparkleIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    id: "bulletList",
    title: "Bullet List",
    description: "Create a simple bulleted list.",
    icon: <ListBulletsIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "numberedList",
    title: "Numbered List",
    description: "Create a list with numbering.",
    icon: <ListNumbersIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "codeBlock",
    title: "Code Block",
    description: "Capture a code snippet.",
    icon: <CodeBlockIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "taskList",
    title: "Task List",
    description: "Create a list with checkboxes.",
    icon: <CheckSquareIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "table",
    title: "Table",
    description: "Create a table.",
    icon: <TableIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setDreamTable({ columns: 3, rows: 3 })
        .run();
    },
  },

  // Add more items here (e.g., Blockquote, Horizontal Rule, Task List)
];

// --- Data Fetching & Filtering ---
async function fetchDreamSlashItems(query: string): Promise<IDreamSlashItem[]> {
  const lowerCaseQuery = query.toLowerCase();
  return DREAM_SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().startsWith(lowerCaseQuery) ||
      (item.description &&
        item.description.toLowerCase().includes(lowerCaseQuery)),
  ).slice(0, 10); // Limit results for performance
}

const suggestionOptionsDefinition = (
  // Assuming styles from DreamConnection.module.scss or a new DreamSlash.module.scss
  // If styles are different, a new CSS module would be needed.
  customStyles: Record<string, string>,
): Omit<SuggestionOptions<IDreamSlashItem>, "editor"> => {
  return {
    char: "/",
    allowSpaces: false, // Usually slash commands don't allow spaces in the trigger query
    items: async ({ query }) => {
      return await fetchDreamSlashItems(query);
    },
    pluginKey: suggestionKey,
    render: () => {
      let element: HTMLElement | null = null;
      let root: import("react-dom/client").Root | null = null;
      let currentProps: SuggestionProps<IDreamSlashItem> | null = null;
      let activeIndex = 0;

      const renderListItems = () => {
        if (!currentProps || !root) return;

        const rect = currentProps.clientRect ? currentProps.clientRect() : null;
        if (!rect || rect.width === 0) {
          // Don't render if the rect is invalid, which prevents the flicker
          // in the top-left corner.
          return;
        }
        console.log("Client rect:", rect);

        root.render(
          <SuggestionMenu
            items={currentProps.items.map((s_item) => {
              return {
                id: s_item.id,
                label: s_item.title,
                icon: s_item.icon, // Use the icon from the item
                description: s_item.description,
              };
            })}
            activeIndex={activeIndex}
            getReferenceClientRect={currentProps.clientRect as () => DOMRect}
            onSelectionMade={(index) => {
              const item = currentProps?.items[index];
              if (!item) return;
              currentProps?.command(item);
            }}
          />,
        );
      };

      return {
        onStart: (props) => {
          element = document.createElement("div");
          // Use the styles passed in (or from DreamConnection.module.scss)
          element.classList.add(customStyles.suggestionList);
          document.body.appendChild(element);

          root = createRoot(element);
          currentProps = props;
          activeIndex = 0;
          renderListItems();
        },

        onUpdate: (props) => {
          currentProps = props;
          activeIndex = 0;
          renderListItems();
        },

        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (
            !element ||
            !root ||
            !currentProps ||
            currentProps.items.length === 0
          ) {
            return false;
          }

          const itemCount = currentProps.items.length;

          if (event.key === "ArrowUp") {
            activeIndex = (activeIndex - 1 + itemCount) % itemCount;
            renderListItems();
            return true;
          }

          if (event.key === "ArrowDown") {
            activeIndex = (activeIndex + 1) % itemCount;
            renderListItems();
            return true;
          }

          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            const selectedItem = currentProps.items[activeIndex];
            if (selectedItem) {
              currentProps.command(selectedItem);
            }
            return true;
          }

          return false;
        },

        onExit: () => {
          root?.unmount();
          element?.remove();
          element = null;
          root = null;
          currentProps = null;
          activeIndex = 0;
        },
      };
    },
    command: ({ editor, range, props }) => {
      // props is IDreamSlashItem
      props.command({ editor, range });
    },
  };
};

export const DreamSlash = Extension.create<IDreamSlashOptions>({
  name: "dreamSlash",

  addOptions() {
    return {
      // Default options can be set here
    };
  },

  addProseMirrorPlugins() {
    // Pass the imported styles to the suggestion options
    const suggestionPluginOptions = suggestionOptionsDefinition({});

    return [
      Suggestion({
        editor: this.editor,
        ...suggestionPluginOptions,
      }),
    ];
  },
});
