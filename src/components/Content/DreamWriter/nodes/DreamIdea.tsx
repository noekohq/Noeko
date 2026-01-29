import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  LightbulbIcon,
  ShieldSlashIcon,
  TrashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { Editor as IEditor } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
  NodeViewContent,
} from "@tiptap/react";
import styles from "./styles/DreamIdea.module.scss";
import { ActionIcon, Flex, Group, Popover, Stack, Text } from "@mantine/core";
import { Link, useNavigate } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IIdea } from "../../../../../shared/types/idea";
import OverviewAccordion from "../../../Display/Ideas/OverviewAccordion";
import { DreamIdeaSchema } from "../../../../../shared/editing/tiptap/nodes/DreamIdea";
import { useEffect, useState } from "react";
import PaperButton from "../../../Display/Paper/PaperButton";

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

export const DreamIdea = DreamIdeaSchema.extend({
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
  extension,
}) => {
  const { ideaId } = node.attrs;

  const isEmpty = node.content.size === 0;
  const [hasAccess, setHasAccess] = useState(true);

  const { data: idea, load: fetchIdea } = useFetch<undefined, IIdea>({
    url: `/ideas/${ideaId}?withDerived=true`,
    skip403Redirect: true,
    onError: (error) => {
      console.error("Error getting idea to connect: ", error);
      if ((error as any)?.response?.status === 403) {
        setHasAccess(false);
      }
    },
  });

  useEffect(() => {
    fetchIdea();
  }, []);

  if (!ideaId) {
    return <span className={styles.dreamIdeaError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamIdeaWrapper}
      data-selected={selected || undefined}
    >
      <Popover width={"400px"} shadow="md" position="top" radius="lg">
        <Popover.Target>
          <Flex align={"center"} justify={"center"}>
            {hasAccess ? (
              <LightbulbIcon
                className={styles.dreamIdeaIcon}
                weight="regular"
              />
            ) : (
              <ShieldSlashIcon
                className={styles.dreamIdeaIcon}
                weight="regular"
              />
            )}
          </Flex>
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
          ) : !hasAccess ? (
            <Stack gap="sm" align="center">
              <ShieldSlashIcon
                size={32}
                weight="regular"
                color="var(--mantine-color-dimmed)"
              />
              <Text c="dimmed" size="sm" ta="center">
                You don't have access to preview this idea
              </Text>
              <Link to={`/idea/${ideaId}`}>
                <ActionIcon
                  title="Request Access"
                  variant="light"
                  color="gray"
                  size="md"
                  radius="md"
                >
                  <ArrowRightIcon weight="bold" size={12} />
                </ActionIcon>
              </Link>
            </Stack>
          ) : (
            <Text c="dimmed" size="xs">
              Could not find idea :/
            </Text>
          )}
        </Popover.Dropdown>
      </Popover>

      <Link
        to={`/idea/${idea?.id.toString()}`}
        className={styles.dreamIdeaInline}
      >
        <NodeViewContent
          className={`${styles.dreamIdeaContent} ${!idea ? styles.notFound : ""}`}
          data-placeholder={
            isEmpty ? idea?.title || "Loading title..." : undefined
          }
          title={`Go to "${idea?.title}"`}
        />
      </Link>
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
