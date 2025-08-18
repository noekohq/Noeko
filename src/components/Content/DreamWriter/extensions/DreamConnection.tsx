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
import { Lightbulb, LightbulbIcon } from "@phosphor-icons/react";
import { getNodeDescription, getNodeTitle } from "../../../../utils/graph";
import { EditorState, PluginKey } from "@tiptap/pm/state";
import { debounce } from "lodash";

const suggestionKey = new PluginKey("dream-connection");

export interface IDreamConnectionOptions {
  allowedTypes?: string[];
}

export type IDreamConnectionItem =
  | ({ type: "idea" } & IIdea)
  | ({ type: "file" } & IUserFile);

async function fetchDreamConnectionItems(
  query: string,
): Promise<IDreamConnectionItem[]> {
  // If the query is empty, don't hit the API
  if (!query) {
    return [];
  }
  try {
    const response = await api.get(`/search/ideas/suggest?query=${query}`);
    const items = response.data.data.map((item: IIdea) => ({
      ...item,
      type: "idea",
    }));
    return items;
  } catch (error) {
    console.error(error);
    return []; // Return empty array on error
  }
}

const debouncedFetchDreamConnectionItems = debounce(
  fetchDreamConnectionItems,
  500,
);

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
      const items = await debouncedFetchDreamConnectionItems(query);
      if (!items) {
        return [];
      }
      return items;
    },
    render: () => {
      let element: HTMLElement | null = null;
      let root: import("react-dom/client").Root | null = null;
      let currentProps: SuggestionProps<IDreamConnectionItem> | null = null;
      let activeIndex = 0;

      const renderComponent = (
        props: SuggestionProps<IDreamConnectionItem>,
        loading: boolean,
      ) => {
        if (!root) return;
        root.render(
          <SuggestionMenu
            loading={loading} // <-- Pass the loading state
            items={props.items.map((s) => ({
              id: s.id.toString(),
              label: getNodeTitle(s) ?? "Unknown",
              icon: <LightbulbIcon />,
            }))}
            activeIndex={activeIndex}
            getReferenceClientRect={props.clientRect as () => DOMRect}
            onSelectionMade={(index) => {
              const item = props.items[index];
              if (item) {
                props.command(item);
              }
            }}
          />,
        );
      };

      return {
        onStart: (props) => {
          element = document.createElement("div");
          element.classList.add(styles.suggestionList);
          document.body.appendChild(element);

          root = createRoot(element);
          currentProps = props;
          activeIndex = 0;
          // Render the component in its loading state
          renderComponent(props, true);
        },

        onUpdate: (props) => {
          currentProps = props;
          activeIndex = 0;
          // Items have loaded, render with data and loading=false
          renderComponent(props, false);
        },

        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (!currentProps || currentProps.items.length === 0) {
            return false;
          }

          const itemCount = currentProps.items.length;
          let handled = false;

          if (event.key === "ArrowUp") {
            activeIndex = (activeIndex - 1 + itemCount) % itemCount;
            handled = true;
          } else if (event.key === "ArrowDown") {
            activeIndex = (activeIndex + 1) % itemCount;
            handled = true;
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            const selectedItem = currentProps.items[activeIndex];
            if (selectedItem) {
              currentProps.command(selectedItem);
            }
            handled = true;
          }

          if (handled) {
            // Re-render to update the active index highlight
            renderComponent(currentProps, false);
          }

          return handled;
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
      const triggerText = editor.state.doc.textBetween(range.from, range.to);

      const queryStartIndex = triggerText.lastIndexOf("[[");
      const originalQuery = triggerText.substring(queryStartIndex + 2);

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
            .deleteRange(finalRange)
            .setDreamIdea({
              ideaId: props.id.toString(),
              content: originalQuery,
            })
            .run(),
        file: () =>
          editor
            .chain()
            .focus()
            .deleteRange(finalRange)
            .setDreamFile({
              fileId: props.id.toString(),
              fileName: originalQuery,
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
