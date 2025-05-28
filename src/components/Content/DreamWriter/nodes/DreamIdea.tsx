import {
  ArrowRight,
  DownloadSimple,
  File,
  FilePdf,
  Lightbulb,
  X,
} from "@phosphor-icons/react";
// Keep other imports...
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewContent, // Keep import if needed elsewhere, but maybe not used below
  NodeViewWrapper,
} from "@tiptap/react";
import styles from "./styles/DreamIdea.module.scss";
import {
  ActionIcon,
  Card,
  Flex,
  Group,
  HoverCard,
  Stack,
  Text,
} from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IIdea } from "../../../../../app/database/models/ideas";
import { useIdea } from "../../../../contexts/IdeaContext";
import { getNodeDescription } from "../../../../utils/graph";
import { getIdeaSummaryItemIfExists } from "../../../../utils/ideas";
import OverviewAccordion from "../../../Display/Ideas/OverviewAccordion";

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
  group: "block",
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
        keepOnSplit: false,
      },
      ideaAlias: {
        default: "Untitled Idea",
        parseHTML: (element) => element.getAttribute("data-idea-alias"),
        renderHTML: (attributes) => ({
          "data-idea-alias": attributes.ideaAlias,
        }),
        keepOnSplit: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-dream-idea][data-idea-id][data-idea-alias]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-idea": "",
      }),
    ];
  },

  addCommands() {
    return {
      setDreamIdea:
        (options) =>
        ({ commands }) => {
          if (!options.ideaId || !options.ideaAlias) {
            console.error("Cannot set idea link without ideaId and ideaAlias");
            return false;
          }
          const attrs = {
            ideaId: options.ideaId,
            ideaAlias: options.ideaAlias,
          };
          return commands.insertContent({
            type: this.name,
            attrs: attrs,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DreamIdeaComponent);
  },
});

export const DreamIdeaComponent: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, editor, selected } = props;
  const { ideaId, ideaAlias } = node.attrs;

  const { idea: parentIdea, ensureConnected } = useIdea();
  ensureConnected(ideaId);

  const { data: idea } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}?withDerived=true`,
    runOnMount: !!ideaId,
  });

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    deleteNode();
  };

  if (!ideaId) {
    return <div>Error: missing idea ID</div>;
  }

  const displayName = ideaAlias || idea?.title || "Untitled Idea";

  return (
    <NodeViewWrapper
      className={styles.dreamFile}
      data-file-link-node
      data-selected={selected || undefined}
    >
      <Card radius="md" withBorder shadow="xs" p="md">
        <Flex
          direction="column"
          justify="flex-start"
          gap="md"
          style={{ width: "100%" }}
        >
          <Link
            to={`/idea/${ideaId}`}
            rel="noopener noreferrer nofollow"
            className={styles.dreamIdeaLink}
            title={`Go to ${displayName}`}
            style={{ textDecoration: "none" }}
          >
            <HoverCard width="target">
              <HoverCard.Target>
                <Stack>
                  <Group align="center" wrap="nowrap">
                    <Flex c="dark.1" align="center" style={{ flexShrink: 0 }}>
                      {<Lightbulb />}
                    </Flex>
                    <Text c="dark.1" size="lg" truncate>
                      {displayName}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {idea
                      ? getNodeDescription({
                          ...idea,
                          type: "idea",
                        })
                      : "No preview available"}
                  </Text>
                </Stack>
              </HoverCard.Target>
              <HoverCard.Dropdown
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {idea?.derived?.generative_summary ? (
                  <OverviewAccordion
                    overview={idea?.derived?.generative_summary}
                  />
                ) : (
                  <Text c="dimmed" size="xs">
                    No preview available :(
                  </Text>
                )}
              </HoverCard.Dropdown>
            </HoverCard>
          </Link>

          <Group>
            {editor.isEditable && (
              <ActionIcon
                onClick={handleDelete}
                title="Remove idea link"
                color="red"
                variant="light"
              >
                <X weight="bold" />
              </ActionIcon>
            )}
            <Link to={`/idea/${ideaId}`} title="Go to idea page">
              <ActionIcon variant="light">
                <ArrowRight weight="bold" />
              </ActionIcon>
            </Link>
          </Group>
        </Flex>
      </Card>
    </NodeViewWrapper>
  );
};
