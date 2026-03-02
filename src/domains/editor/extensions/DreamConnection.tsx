import { createRoot } from "react-dom/client";
import { Extension, Range } from "@tiptap/core";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionMatch,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";

import { api } from "@infrastructure/api/client";
import SuggestionMenu from "./Components/SuggestionMenu";
import { getNodeTitle, getTypeFromId, NodeIcon } from "@infrastructure/graph/utils";
import { PluginKey } from "@tiptap/pm/state";
import { debounce } from "lodash";
import { IConnectable } from "../../../../shared/types/constellation";
import { ISearchResultValue } from "../../../../shared/types/search";
import { createIdea, handleCreateNewConnectedIdea, newIdea } from "@domains/knowledge/utils/ideas";
import { showNotification } from "@mantine/notifications";
import { PlusIcon } from "@phosphor-icons/react";

export interface IDreamConnectionOptions {
  allowedTypes?: string[];
}

export type IDreamConnectionItem = IConnectable;

async function fetchDreamConnectionItems(query: string): Promise<IDreamConnectionItem[]> {
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
    return [];
  }
}

async function fetchDreamConnectionItemsSemantic(query: string): Promise<IDreamConnectionItem[]> {
  if (!query) {
    return [];
  }
  try {
    const response = await api.get(`/search/smartSuggest?query=${query}`);
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
  200
);

const debouncedFetchSmart = debounce(
  (query: string, resolve: (items: IDreamConnectionItem[]) => void) => {
    fetchDreamConnectionItemsSemantic(query).then(resolve);
  },
  500
);

const suggestionOptionsDefinition = (
  styles: Record<string, string>
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
    items: () => [],
    render: () => {
      let element: HTMLElement | null = null;
      let root: import("react-dom/client").Root | null = null;
      let currentProps: SuggestionProps<IDreamConnectionItem> | null = null;

      let query: string = "";
      let items: IDreamConnectionItem[] = [];
      const allItems = () => [
        {
          id: "new-idea",
          label: `Create “${query}”`,
          icon: <PlusIcon />,
        },
        ...items.map((s) => {
          const Icon = NodeIcon(s);
          return {
            ...s,
            id: s.id.toString(),
            label: getNodeTitle(s) ?? "Unknown",
            icon: Icon ? <Icon /> : undefined,
            type: s.type || getTypeFromId((s as any).id.toString()),
          };
        }),
      ];
      let isLoading = false;
      let activeIndex = 0;

      const renderComponent = () => {
        if (!root || !currentProps) return;

        root.render(
          <SuggestionMenu
            loading={isLoading}
            items={allItems()}
            activeIndex={activeIndex}
            getReferenceClientRect={currentProps.clientRect as () => DOMRect}
            onSelectionMade={(index) => {
              const item = allItems()[index];
              if (item && currentProps) {
                currentProps.command(item);
              }
            }}
          />
        );
      };

      const debouncedFetchAndUpdate = debounce((query: string) => {
        fetchDreamConnectionItemsSemantic(query).then((fetchedItems) => {
          if (query === currentProps?.query) {
            items = fetchedItems;
            isLoading = false;
            renderComponent();
          }
        });
      }, 500);

      return {
        onStart: (props) => {
          element = document.createElement("div");
          element.classList.add(styles.suggestionList);
          document.body.appendChild(element);

          root = createRoot(element);
          currentProps = props;

          isLoading = true;
          items = [];
          activeIndex = 0;
          query = props.query;
          renderComponent();
          debouncedFetchAndUpdate(props.query);
        },

        onUpdate: (props) => {
          currentProps = props;

          isLoading = true;
          items = [];
          activeIndex = 0;
          query = props.query;
          renderComponent();
          debouncedFetchAndUpdate(props.query);
        },

        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (!currentProps) {
            return false;
          }

          const itemCount = allItems().length;
          let handled = false;

          if (event.key === "ArrowUp") {
            activeIndex = (activeIndex - 1 + itemCount) % itemCount;
            handled = true;
          } else if (event.key === "ArrowDown") {
            activeIndex = (activeIndex + 1) % itemCount;
            handled = true;
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            const selectedItem = allItems()[activeIndex];
            if (selectedItem) {
              currentProps.command(selectedItem);
            }
            handled = true;
          }

          if (handled) {
            renderComponent();
          }

          return handled;
        },

        onExit: () => {
          debouncedFetchAndUpdate.cancel(); // Cancel any pending fetches
          root?.unmount();
          element?.remove();
          element = null;
          root = null;
          currentProps = null;
          items = [];
          activeIndex = 0;
          isLoading = false;
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

      if (props.id === "new-idea") {
        createIdea({
          title: originalQuery,
          content: "",
        })
          .then((idea) => {
            if (!idea) {
              showNotification({
                title: "Error",
                message: "Couldn't create new idea",
                color: "red",
              });
              return;
            }
            editor
              .chain()
              .focus()
              .deleteRange(finalRange)
              .setDreamIdea({
                ideaId: idea.id.toString(),
                content: idea.title,
              })
              .run();
          })
          .catch((error) => {
            console.error("Error creating new idea: ", error);
            showNotification({
              title: "Error",
              message: "Couldn't create new idea",
              color: "red",
            });
          });
        return;
      }

      const insertionPos = finalRange.from;

      const commandMap: Record<string, () => boolean> = {
        idea: () => {
          const content = props.title ?? "";
          const from = insertionPos + 1;
          const to = from + content.length;

          return editor
            .chain()
            .focus()
            .deleteRange(finalRange)
            .setDreamIdea({
              ideaId: props.id.toString(),
              content: content,
            })
            .setTextSelection({ from, to }) // <-- Select the inner content
            .run();
        },
        source: () => {
          const content = props.displayName ?? "";
          const from = insertionPos + 1;
          const to = from + content.length;

          return editor
            .chain()
            .focus()
            .deleteRange(finalRange)
            .setDreamSource({
              sourceId: props.id.toString(),
              content: content,
            })
            .setTextSelection({ from, to }) // <-- Select the inner content
            .run();
        },
        task: () => {
          const content = originalQuery ?? "";
          const from = insertionPos + 1;
          const to = from + content.length;

          return editor
            .chain()
            .focus()
            .deleteRange(finalRange)
            .setDreamTask({
              taskId: props.id.toString(),
              content: content,
            })
            .setTextSelection({ from, to }) // <-- Select the inner content
            .run();
        },
      };

      if (props.type === "idea" || props.type === "source" || props.type === "task") {
        const cmd = commandMap[props.type];
        cmd();
      }
    },
  };
};

export const DreamConnection = Extension.create<IDreamConnectionOptions>({
  name: "dreamConnection",

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
