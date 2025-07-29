import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CheckIcon,
  LightbulbIcon,
  PencilSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Node, mergeAttributes, Editor as IEditor } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
  NodeViewContent,
} from "@tiptap/react";
import styles from "./styles/DreamIdea.module.scss";
import { ActionIcon, Group, HoverCard, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IIdea } from "../../../../../app/database/models/ideas";
import OverviewAccordion from "../../../Display/Ideas/OverviewAccordion";
import { DOMParser, Fragment } from "@tiptap/pm/model";
import { useIdea } from "../../../../contexts/IdeaContext";

export interface IDreamIdeaOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamIdea: {
      setDreamIdea: (options: {
        ideaId: string;
        content: string;
      }) => ReturnType;
    };
  }
}

export const DreamIdea = Node.create<IDreamIdeaOptions>({
  name: "dreamIdea",
  group: "inline",
  inline: true,
  draggable: true,
  content: "text*",

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
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-dream-idea][data-idea-alias]",
        getContent: (node, schema) => {
          const dom = node as HTMLElement;
          const alias = dom.getAttribute("data-idea-alias");

          if (alias) {
            return Fragment.from(schema.text(alias));
          }

          return Fragment.empty;
        },
      },

      {
        tag: "span[data-dream-idea][data-idea-id]",
        getContent: (node, schema) => {
          const dom = node as HTMLElement;
          return DOMParser.fromSchema(schema).parseSlice(dom).content;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-idea": "",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamIdea:
        (options) =>
        ({ commands }) => {
          if (!options.ideaId || !options.content) {
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: { ideaId: options.ideaId },
            content: [{ type: "text", text: options.content }],
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DreamIdeaComponent);
  },
});

export const DreamIdeaComponent: React.FC<NodeViewProps> = ({
  node,
  deleteNode,
  selected,
}) => {
  const { ideaId } = node.attrs;

  const isEmpty = node.content.size === 0;

  const { data: idea } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}?withDerived=true`,
    runOnMount: !!ideaId,
  });

  const { ensureConnected } = useIdea();
  ensureConnected(ideaId);

  if (!ideaId) {
    return <span className={styles.dreamIdeaError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamIdeaInline}
      data-selected={selected || undefined}
    >
      <HoverCard
        width={"400px"}
        shadow="md"
        position="top"
        openDelay={300}
        radius="lg"
      >
        <HoverCard.Target>
          <ActionIcon variant="subtle" size="sm" color="gray" radius="md">
            <LightbulbIcon className={styles.dreamIdeaIcon} weight="regular" />
          </ActionIcon>
        </HoverCard.Target>

        <HoverCard.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {idea ? (
            <Stack>
              <Group justify="space-between">
                <Text fw={500} c="dimmed">
                  {idea.title}
                </Text>
                <Group justify="flex-end">
                  <ActionIcon
                    onClick={deleteNode}
                    variant="subtle"
                    color="gray"
                    size="sm"
                  >
                    <XIcon weight="bold" />
                  </ActionIcon>
                  <Link to={`/idea/${ideaId}`}>
                    <ActionIcon
                      title="Open Idea"
                      variant="subtle"
                      color="gray"
                      size="sm"
                    >
                      <ArrowRightIcon weight="bold" />
                    </ActionIcon>
                  </Link>
                </Group>
              </Group>
              {idea.derived?.generative_summary && (
                <OverviewAccordion overview={idea.derived.generative_summary} />
              )}
              <div
                dangerouslySetInnerHTML={{
                  __html: idea.content,
                }}
              />
            </Stack>
          ) : (
            <Text c="dimmed" size="xs">
              Loading preview...
            </Text>
          )}
        </HoverCard.Dropdown>
      </HoverCard>

      <NodeViewContent
        as="span"
        className={styles.dreamIdeaContent}
        data-placeholder={
          isEmpty ? idea?.title || "Loading title..." : undefined
        }
      />
    </NodeViewWrapper>
  );
};

interface IDreamIdeaMenuProps {
  editor: IEditor;
}

export const DreamIdeaMenu = ({ editor }: IDreamIdeaMenuProps) => {
  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamIdea").run();
  };

  const ideaId = editor.getAttributes("dreamIdea").ideaId;

  return (
    <>
      <Link to={`/idea/${ideaId}`}>
        <ActionIcon title="Open Idea">
          <ArrowSquareOutIcon />
        </ActionIcon>
      </Link>
      <ActionIcon title="Delete Idea" color="red" onClick={deleteSelectedNode}>
        <TrashIcon />
      </ActionIcon>
    </>
  );
};
