import {
  ArrowRightIcon,
  CheckIcon,
  LightbulbIcon,
  XIcon,
} from "@phosphor-icons/react";
// Keep other imports...
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import styles from "./styles/DreamIdea.module.scss";
import {
  ActionIcon,
  Group,
  HoverCard,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IIdea } from "../../../../../app/database/models/ideas";
import { useIdea } from "../../../../contexts/IdeaContext";
import { getNodeDescription } from "../../../../utils/graph";
import OverviewAccordion from "../../../Display/Ideas/OverviewAccordion";
import { useState } from "react";

export interface IDreamIdeaOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamIdea: {
      setDreamIdea: (options: {
        ideaId: string;
        ideaAlias: string;
      }) => ReturnType;
    };
  }
}

export const DreamIdea = Node.create<IDreamIdeaOptions>({
  name: "dreamIdea",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      ideaId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-idea-id"),
        renderHTML: (attributes) => ({ "data-idea-id": attributes.ideaId }),
      },
      ideaAlias: {
        default: "Idea",
        // CHANGED: Parse the alias from its own data attribute.
        parseHTML: (element) => element.getAttribute("data-idea-alias"),
        // This was correct: it renders the 'data-idea-alias' attribute.
        renderHTML: (attributes) => ({
          "data-idea-alias": attributes.ideaAlias,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        // CHANGED: The tag selector now requires the data-idea-alias attribute to match.
        // This makes parsing more specific and reliable.
        tag: "span[data-dream-idea][data-idea-id][data-idea-alias]",
        // We no longer need a custom `getAttrs` function here, as Tiptap will
        // automatically use the `parseHTML` function from each attribute above.
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // CHANGED: The node's content is now explicitly empty.
    // The `HTMLAttributes` object, automatically populated by the attribute-level
    // `renderHTML` functions, contains all the data we need (`data-idea-id` and `data-idea-alias`).
    // The saved HTML will look like: <span data-idea-id="..." data-idea-alias="..."></span>
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-idea": "",
      }),
    ];
  },

  addCommands() {
    // This function remains the same as the previous refactor. It works perfectly.
    return {
      setDreamIdea:
        (options) =>
        ({ commands }) => {
          if (!options.ideaId || !options.ideaAlias) {
            console.error("Cannot set idea without ideaId and ideaAlias");
            return false;
          }
          const sanitizedAlias = options.ideaAlias
            .replace(/(\r\n|\n|\r)/gm, " ")
            .trim();
          return commands.insertContent({
            type: this.name,
            attrs: {
              ideaId: options.ideaId,
              ideaAlias: sanitizedAlias,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DreamIdeaComponent);
  },
});

const DreamIdeaComponent: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, selected, updateAttributes } = props;
  // Get both attributes
  const { ideaId, ideaAlias } = node.attrs;
  const [updatedAlias, setUpdatedAlias] = useState(ideaAlias);

  const { ensureConnected } = useIdea();
  ensureConnected(ideaId);

  const { data: idea } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}?withDerived=true`,
    runOnMount: !!ideaId,
  });

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    deleteNode();
  };

  const [editing, setEditing] = useState(false);

  if (!ideaId) {
    return <span className={styles.dreamIdeaError}>Error: Missing ID</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamIdeaInline}
      data-selected={selected || undefined}
    >
      <HoverCard width={300} shadow="md" position="top" openDelay={300}>
        <HoverCard.Target>
          <span className={styles.dreamIdeaTarget}>
            {editing ? (
              <ActionIcon
                onClick={() => {
                  updateAttributes({ ideaAlias: updatedAlias });
                  setEditing(false);
                }}
                variant="subtle"
                size="xs"
              >
                <CheckIcon size={16} />
              </ActionIcon>
            ) : (
              <LightbulbIcon
                className={styles.dreamIdeaIcon}
                weight="regular"
              />
            )}
            {editing ? (
              <TextInput
                value={updatedAlias}
                onChange={(e) => setUpdatedAlias(e.target.value)}
                onBlur={() => {
                  updateAttributes({ ideaAlias: updatedAlias });
                  setEditing(false);
                }}
                size="xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateAttributes({ ideaAlias: updatedAlias });
                    setEditing(false);
                  }
                  if (e.key === "Escape") {
                    setEditing(false);
                  }
                }}
              />
            ) : (
              <span
                className={styles.dreamIdeaContent}
                onClick={() => setEditing(true)}
              >
                {ideaAlias}
              </span>
            )}
          </span>
        </HoverCard.Target>
        <HoverCard.Dropdown
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{
            overflowY: "scroll",
            maxHeight: "400px",
          }}
        >
          {idea ? (
            <Stack>
              <Group justify="space-between">
                <Text fw={500} c="dimmed">
                  {idea.title}
                </Text>
                <Group justify="flex-end">
                  <ActionIcon
                    className={styles.deleteButton}
                    onClick={handleDelete}
                    variant="light"
                    color="gray"
                    size="sm"
                  >
                    <XIcon weight="bold" />
                  </ActionIcon>
                  <ActionIcon
                    component={Link}
                    to={`/idea/${ideaId}`}
                    variant="light"
                    color="gray"
                    title="Go to idea page"
                    onClick={(e) => e.stopPropagation()}
                    size="sm"
                  >
                    <ArrowRightIcon weight="bold" />
                  </ActionIcon>
                </Group>
              </Group>
              {idea?.derived?.generative_summary && (
                <OverviewAccordion overview={idea.derived.generative_summary} />
              )}
              <div dangerouslySetInnerHTML={{ __html: idea.content }} />
            </Stack>
          ) : (
            <Text c="dimmed" size="xs">
              Loading preview...
            </Text>
          )}
        </HoverCard.Dropdown>
      </HoverCard>
    </NodeViewWrapper>
  );
};
