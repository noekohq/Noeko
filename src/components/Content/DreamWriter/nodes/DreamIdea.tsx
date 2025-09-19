import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  LightbulbIcon,
  TrashIcon,
  TrashSimpleIcon,
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
import {
  ActionIcon,
  Group,
  HoverCard,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IIdea } from "../../../../../app/database/models/ideas";
import OverviewAccordion from "../../../Display/Ideas/OverviewAccordion";
import { DOMParser, Fragment } from "@tiptap/pm/model";
import { useIdea } from "../../../../contexts/IdeaContext";
import { useEffect } from "react";
import useConnectable from "../../../../hooks/useConnectable";
import { useLandscape } from "../../../../contexts/LandscapeContext";
import { IConnectable } from "../../../../../app/services/Graph";

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
    return ReactNodeViewRenderer(DreamIdeaComponent, {
      contentDOMElementTag: "span",
    });
  },
});

export const DreamIdeaComponent: React.FC<NodeViewProps> = ({
  node,
  deleteNode,
  selected,
}) => {
  const { ideaId } = node.attrs;

  const isEmpty = node.content.size === 0;

  const { data: idea, load: fetchIdea } = useFetch<undefined, IIdea>({
    url: `/ideas/${ideaId}?withDerived=true`,
    onError: (error) => {
      console.error("Error getting idea to connect: ", error);
    },
  });

  useEffect(() => {
    fetchIdea();
  }, []);

  const {
    connectable: {
      viewing: { get: currentConnectable },
    },
  } = useLandscape();
  const { ensureConnected, loadingConnected } = useConnectable({
    connectable: currentConnectable ?? null,
  });
  useEffect(() => {
    if (idea?.id) {
      ensureConnected(idea.id.toString());
    }
  }, [idea?.id.toString(), loadingConnected]);

  if (!ideaId) {
    return <span className={styles.dreamIdeaError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamIdeaInline}
      data-selected={selected || undefined}
    >
      <Popover width={"400px"} shadow="md" position="top" radius="lg">
        <Popover.Target>
          <ActionIcon variant="subtle" size="sm" color="gray" radius="md">
            <LightbulbIcon className={styles.dreamIdeaIcon} weight="regular" />
          </ActionIcon>
        </Popover.Target>

        <Popover.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {idea ? (
            <Stack gap="sm">
              <Group
                justify="space-between"
                align="center"
                w={"100%"}
                wrap="nowrap"
              >
                <Text fw={500} c="dark.3">
                  {idea.title}
                </Text>
                <Group justify="flex-end">
                  <ActionIcon
                    onClick={deleteNode}
                    variant="light"
                    color="gray"
                    size="sm"
                    radius="sm"
                  >
                    <TrashSimpleIcon weight="bold" size={12} />
                  </ActionIcon>
                  <Link to={`/idea/${ideaId}`}>
                    <ActionIcon
                      title="Open Idea"
                      variant="light"
                      color="gray"
                      size="sm"
                      radius="sm"
                    >
                      <ArrowRightIcon weight="bold" size={12} />
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
              Could not find idea :/
            </Text>
          )}
        </Popover.Dropdown>
      </Popover>

      <NodeViewContent
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
