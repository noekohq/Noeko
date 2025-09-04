import { createRoot } from "react-dom/client";
import { Extension, Range } from "@tiptap/core";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionMatch,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";

import { api } from "../../../../server/api";
import SuggestionMenu from "./Components/SuggestionMenu";
import { LightbulbIcon } from "@phosphor-icons/react";
import {
  getNodeDescription,
  getNodeTitle,
  NodeIcon,
} from "../../../../utils/graph";
import { PluginKey } from "@tiptap/pm/state";
import { debounce } from "lodash";
import { IConnectable } from "../../../../../app/services/Graph";
import { ISearchResultValue } from "../../../../../app/services/Search";

const suggestionKey = new PluginKey("dream-connection");

export interface IDreamConnectionOptions {
  allowedTypes?: string[];
}

export type IDreamConnectionItem = IConnectable;

async function fetchDreamConnectionItems(
  query: string,
): Promise<IDreamConnectionItem[]> {
  if (!query) {
    return [];
  }
  try {
    const response = await api.get(`/search/suggest?query=${query}`);
    const items = response.data.data.map((item: ISearchResultValue) => ({
      ...item,
    }));
    return items;
  } catch (error) {
    console.error(error);
    return []; // Return empty array on error
  }
}

const debouncedFetch = debounce(
  (query: string, resolve: (items: IDreamConnectionItem[]) => void) => {
    fetchDreamConnectionItems(query).then(resolve);
  },
  200,
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
      return new Promise((resolve) => {
        debouncedFetch(query, resolve);
      });
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
        console.log("Rendering with: ", props);
        if (!root) {
          console.log("No root to render with...");
          return;
        }
        root.render(
          <SuggestionMenu
            loading={loading}
            items={props.items.map((s) => {
              const Icon = NodeIcon(s);
              return {
                id: s.id.toString(),
                label: getNodeTitle(s) ?? "Unknown",
                icon: Icon ? <Icon /> : undefined,
              };
            })}
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
          renderComponent(props, true);
        },

        onBeforeUpdate: (props) => {
          console.log("Before updating: ", props);
          renderComponent(props, true);
        },

        onUpdate: (props) => {
          currentProps = props;
          activeIndex = 0;
          console.log("Updating: ", props);
          renderComponent(props, false);
        },

        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (!currentProps || currentProps.items.length === 0) {
            console.log("Not returning...");
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
            renderComponent(currentProps, false);
          }

          return handled;
        },

        onExit: () => {
          console.log("Exiting...");
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
        source: () =>
          editor
            .chain()
            .focus()
            .deleteRange(finalRange)
            .setDreamSource({
              sourceId: props.id.toString(),
              content: originalQuery,
            })
            .run(),
        task: () =>
          editor
            .chain()
            .focus()
            .deleteRange(finalRange)
            .setDreamTask({
              taskId: props.id.toString(),
              content: originalQuery,
            })
            .run(),
      };

      if (
        props.type === "idea" ||
        props.type === "source" ||
        props.type === "task"
      ) {
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
