import { createRoot } from "react-dom/client";
import { Extension, Range } from "@tiptap/core";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionMatch,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";

import { IIdea } from "../../../../../app/database/models/ideas";
import { IUserFile } from "../../../../../app/database/models/userfile";
import { api } from "../../../../server/api";
import SuggestionMenu from "./Components/SuggestionMenu";
import { Lightbulb } from "@phosphor-icons/react";
import { getNodeDescription, getNodeTitle } from "../../../../utils/graph";
import { EditorState, PluginKey } from "@tiptap/pm/state";

const suggestionKey = new PluginKey("dream-connection");

// --- Type Definitions ---
export interface IDreamConnectionOptions {
  allowedTypes?: string[];
}

export type IDreamConnectionItem =
  | ({ type: "idea" } & IIdea)
  | ({ type: "file" } & IUserFile);

// --- Data Fetching ---
async function fetchDreamConnectionItems(
  query: string,
): Promise<IDreamConnectionItem[]> {
  try {
    const response = await api.get(`/search/ideas/suggest?query=${query}`);
    return response.data.data.map((item: IIdea) => ({
      ...item,
      type: "idea",
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

const suggestionOptionsDefinition = (
  styles: Record<string, string>,
): Omit<SuggestionOptions<IDreamConnectionItem>, "editor"> => {
  return {
    findSuggestionMatch: (config): SuggestionMatch => {
      const { $position } = config;
      const textBefore = $position.nodeBefore?.text;

      if (!textBefore) {
        return null;
      }

      const suggestionRegex = /(?:^|\s)\[\[([^\]]*)$/;
      const match = textBefore.match(suggestionRegex);

      if (!match) {
        return null;
      }

      const [fullMatch, query] = match[0].startsWith(" ")
        ? [match[0].substring(1), match[1]]
        : [match[0], match[1]];

      const from = $position.pos - fullMatch.length;
      const to = $position.pos;
      const range: Range = { from, to };

      return {
        range,
        query,
        text: fullMatch,
      };
    },
    items: async ({ query }) => {
      return await fetchDreamConnectionItems(query);
    },
    render: () => {
      let element: HTMLElement | null = null;
      let root: import("react-dom/client").Root | null = null;
      let currentProps: SuggestionProps<IDreamConnectionItem> | null = null;
      let activeIndex = 0;

      const renderListItems = () => {
        if (!currentProps || !root) return;
        console.log("Rendering list items!", root, currentProps);

        root.render(
          <SuggestionMenu
            items={currentProps.items.map((s) => {
              return {
                id: s.id.toString(),
                label: getNodeTitle(s) ?? "Unknown",
                icon: <Lightbulb />,
              };
            })}
            activeIndex={activeIndex}
            getReferenceClientRect={currentProps.clientRect as () => DOMRect}
            onSelectionMade={(index) => {
              // Use a guard in case items change.
              const item = currentProps?.items[index];
              if (!item) return;
              currentProps?.command(item);
            }}
          />,
        );
      };

      return {
        onStart: (props) => {
          // FIX: Create the element here and append it to the body.
          element = document.createElement("div");
          element.classList.add(styles.suggestionList);
          document.body.appendChild(element);

          root = createRoot(element);
          currentProps = props;
          activeIndex = 0; // Reset on start
          renderListItems();
        },

        onUpdate: (props) => {
          currentProps = props;
          activeIndex = 0; // Reset on update (e.g., new query)
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
            // FIX: Re-render the component to show the new active index.
            renderListItems();
            return true;
          }

          if (event.key === "ArrowDown") {
            activeIndex = (activeIndex + 1) % itemCount;
            // FIX: Re-render the component to show the new active index.
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
          // The unmount and removal should be robust enough to prevent the race condition.
          // React's unmount will handle cleanup of hooks like useFloating.
          root?.unmount();
          element?.remove();

          // Reset all state variables
          element = null;
          root = null;
          currentProps = null;
          activeIndex = 0;
        },
      };
    },
    command: ({ editor, range, props }) => {
      const textAfter = editor.state.doc.textBetween(range.to, range.to + 2);

      const finalRange = {
        from: range.from,
        to: textAfter === "]]" ? range.to + 2 : range.to,
      };

      const commandMap: Record<string, () => boolean> = {
        idea: () =>
          editor
            .chain()
            .focus()
            .deleteRange(finalRange) // <-- Use the corrected range
            .setDreamIdea({
              ideaId: props.id.toString(),
              content: (props as IIdea).title,
            })
            .run(),
        file: () =>
          editor
            .chain()
            .focus()
            .deleteRange(finalRange) // <-- Use the corrected range
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

export const DreamConnection = Extension.create<IDreamConnectionOptions>({
  name: "dreamConnection",
  pluginKey: suggestionKey,

  addOptions() {
    return {
      allowedTypes: undefined,
    };
  },

  addProseMirrorPlugins() {
    const suggestionPluginOptions = suggestionOptionsDefinition({});

    return [
      Suggestion({
        editor: this.editor,
        ...suggestionPluginOptions,
      }),
    ];
  },
});
