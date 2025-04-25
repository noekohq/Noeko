import { Editor, Extension, Range } from "@tiptap/core";
import { Node } from "@tiptap/pm/model"; // Import Node for potential command usage
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import tippy, { Instance as TippyInstance } from "tippy.js";

// --- CSS Modules Import ---
// Assume DreamConnection.module.scss exists and exports class names
import styles from "./styles/DreamConnection.module.scss";

// --- Database Model Types (Ensure these paths are correct) ---
import { IIdea } from "../../../../../app/database/models/ideas";
import { IUserFile } from "../../../../../app/database/models/userfile";

// --- Type Definitions ---
export interface IDreamConnectionOptions {
  allowedTypes?: string[];
  // Add other potential options for your extension here
}

export type IDreamConnectionItem =
  | ({ type: "idea" } & IIdea)
  | ({ type: "file" } & IUserFile);

// --- Data Fetching ---
async function fetchDreamConnectionItems(
  query: string,
): Promise<IDreamConnectionItem[]> {
  return [];
}

// --- Suggestion Configuration Object ---
const suggestionOptionsDefinition = (
  styles: Record<string, string>,
): Omit<SuggestionOptions<IDreamConnectionItem>, "editor"> => {
  return {
    char: "#",
    items: async ({ query }) => {
      return await fetchDreamConnectionItems(query);
    },
    render: () => {
      let element: HTMLElement | null = null;
      let tippyInstance: TippyInstance | null = null;
      let currentProps: SuggestionProps<IDreamConnectionItem> | null = null;
      let activeIndex = 0;

      const highlightItem = (index: number) => {
        activeIndex = index;
        if (!element) return;
        element
          .querySelectorAll(`.${styles.suggestionItem}`)
          .forEach((itemEl, i) => {
            if (i === index) {
              itemEl.classList.add(styles.isSelected);
              itemEl.scrollIntoView({ block: "nearest" });
            } else {
              itemEl.classList.remove(styles.isSelected);
            }
          });
      };

      const renderListItems = (
        props: SuggestionProps<IDreamConnectionItem>,
      ) => {
        currentProps = props;
        if (!element) return;

        element.innerHTML = "";
        activeIndex = 0;

        if (props.items.length === 0) {
          element.innerHTML = `<div class="${styles.suggestionItem} ${styles.isEmpty}">No results found</div>`;
          // tippyInstance?.hide();
          return;
        } else {
          tippyInstance?.show();
        }

        props.items.forEach((item, index) => {
          const itemElement = document.createElement("button");
          itemElement.className = styles.suggestionItem;
          itemElement.textContent =
            item.type === "idea" ? item.title : item.originalFileName;
          itemElement.dataset.index = String(index);

          const typeSpan = document.createElement("span");
          typeSpan.className = `${styles.suggestionType} ${styles[`suggestionType-${item.type}`] || ""}`;
          typeSpan.textContent = ` (${item.type})`;
          itemElement.appendChild(typeSpan);

          itemElement.addEventListener("mousedown", (event) => {
            event.preventDefault();
            props.command(item);
          });

          itemElement.addEventListener("mouseenter", () => {
            highlightItem(index);
          });

          element?.appendChild(itemElement);
        });

        highlightItem(0);
      };

      return {
        onStart: (props) => {
          element = document.createElement("div");
          element.className = styles.suggestionList;

          renderListItems(props);

          if (element) {
            tippyInstance = tippy(document.body, {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              appendTo: () => document.body,
              content: element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          }

          // if (props.items.length === 0) {
          //   tippyInstance?.hide();
          // }
        },

        onUpdate: (props) => {
          if (!element || !tippyInstance) return;
          renderListItems(props);
          // tippyInstance.popperInstance?.update(); // Usually not needed with getReferenceClientRect
        },

        onExit: () => {
          tippyInstance?.destroy();
          element?.remove();
          element = null;
          tippyInstance = null;
          currentProps = null;
          activeIndex = 0;
        },

        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (
            !element ||
            !tippyInstance ||
            !currentProps ||
            currentProps.items.length === 0
          )
            return false;

          const itemCount = currentProps.items.length;

          if (event.key === "ArrowUp") {
            activeIndex = (activeIndex - 1 + itemCount) % itemCount;
            highlightItem(activeIndex);
            return true;
          }

          if (event.key === "ArrowDown") {
            activeIndex = (activeIndex + 1) % itemCount;
            highlightItem(activeIndex);
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
      };
    },
    command: ({ editor, range, props }) => {
      const commandMap: Record<string, () => boolean> = {
        idea: () =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setDreamIdea({
              ideaId: props.id.toString(),
              ideaAlias: (props as IIdea).title,
            })
            .run(),
        file: () =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setDreamFile({
              fileId: props.id.toString(),
              fileName: (props as IUserFile).originalFileName,
              fileType: (props as IUserFile).mimeType,
            })
            .run(),
      };

      if (props.type === "idea" || props.type === "file") {
        commandMap[props.type]();
      }
    },
  };
};

// --- Tiptap Extension ---
export const DreamConnection = Extension.create<IDreamConnectionOptions>({
  name: "dreamConnection",

  addOptions() {
    return {
      allowedTypes: undefined,
    };
  },

  addProseMirrorPlugins() {
    // Generate options with styles object here
    const suggestionPluginOptions = suggestionOptionsDefinition(styles);

    return [
      Suggestion({
        editor: this.editor,
        ...suggestionPluginOptions,
      }),
    ];
  },
});
