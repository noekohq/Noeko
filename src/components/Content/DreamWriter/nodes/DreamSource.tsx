import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  FileTextIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Editor as IEditor } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
  NodeViewContent,
} from "@tiptap/react";
import { useEffect } from "react";
import styles from "./styles/DreamSource.module.scss";
import { ActionIcon, Group, HoverCard, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { ISource } from "../../../../../app/database/models/source";
import { DreamSourceSchema } from "../../../../../shared/editing/tiptap/nodes/DreamSource";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamSource: {
      setDreamSource: (options: {
        sourceId: string;
        content: string;
      }) => ReturnType;
    };
  }
}

export const DreamSource = DreamSourceSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamSourceComponent, {
      contentDOMElementTag: "span",
    });
  },
});

export const DreamSourceComponent: React.FC<NodeViewProps> = ({
  editor,
  node,
  deleteNode,
  selected,
  extension,
}) => {
  const { sourceId } = node.attrs;
  const isEditable = extension.options.editable as boolean;

  const isEmpty = node.content.size === 0;

  const { data: source, load: fetchSource } = useFetch<undefined, ISource>({
    url: `/sources/${sourceId}`,
  });

  useEffect(() => {
    if (isEditable) {
      fetchSource();
    }
  }, [isEditable]);

  if (!sourceId) {
    return <span className={styles.dreamSourceError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamSourceInline}
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
            <FileTextIcon className={styles.dreamSourceIcon} weight="regular" />
          </ActionIcon>
        </HoverCard.Target>

        <HoverCard.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {source ? (
            <Stack>
              <Group justify="flex-end">
                <ActionIcon
                  onClick={deleteNode}
                  variant="subtle"
                  color="gray"
                  size="sm"
                >
                  <XIcon weight="bold" />
                </ActionIcon>
                <Link to={`/source/${sourceId}`}>
                  <ActionIcon
                    title="Open Source"
                    variant="subtle"
                    color="gray"
                    size="sm"
                  >
                    <ArrowRightIcon weight="bold" />
                  </ActionIcon>
                </Link>
              </Group>
              <Text c="dimmed" fw="bold" size="sm">
                {source.displayName}
              </Text>
              <Text size="sm">{source.analysis?.abstract}</Text>
            </Stack>
          ) : (
            <Text c="dimmed" size="xs">
              Could not find source :/
            </Text>
          )}
        </HoverCard.Dropdown>
      </HoverCard>

      <NodeViewContent
        className={styles.dreamSourceContent}
        data-placeholder={
          isEmpty ? source?.displayName || "Loading title..." : undefined
        }
      />
    </NodeViewWrapper>
  );
};

interface IDreamSourceMenuProps {
  editor: IEditor;
}

export const DreamSourceMenu = ({ editor }: IDreamSourceMenuProps) => {
  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamSource").run();
  };

  const sourceId = editor.getAttributes("dreamSource").sourceId;

  return (
    <>
      <Link to={`/source/${sourceId}`}>
        <ActionIcon title="Open Source">
          <ArrowSquareOutIcon />
        </ActionIcon>
      </Link>
      <ActionIcon
        title="Delete Source"
        color="red"
        onClick={deleteSelectedNode}
      >
        <TrashIcon />
      </ActionIcon>
    </>
  );
};
