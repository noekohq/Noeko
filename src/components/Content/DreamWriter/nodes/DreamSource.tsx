import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  FileTextIcon,
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
import { useEffect, useState } from "react";
import styles from "./styles/DreamSource.module.scss";
import { ActionIcon, Flex, Group, Popover, Stack, Text } from "@mantine/core";
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
  node,
  deleteNode,
  selected,
  extension,
}) => {
  const { sourceId } = node.attrs;

  const isEmpty = node.content.size === 0;
  const [hasAccess, setHasAccess] = useState(true);

  const { data: source, load: fetchSource } = useFetch<undefined, ISource>({
    url: `/sources/${sourceId}`,
    skip403Redirect: true,
    onError: (error) => {
      console.error("Error getting source to connect: ", error);
      if ((error as any)?.response?.status === 403) {
        setHasAccess(false);
      }
    },
  });

  useEffect(() => {
    fetchSource();
  }, []);

  if (!sourceId) {
    return <span className={styles.dreamSourceError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamSourceWrapper}
      data-selected={selected || undefined}
    >
      <Popover width={"400px"} shadow="md" position="top" radius="lg">
        <Popover.Target>
          <Flex align={"center"} justify={"center"}>
            {hasAccess ? (
              <FileTextIcon
                className={styles.dreamSourceIcon}
                weight="regular"
              />
            ) : (
              <ShieldSlashIcon
                className={styles.dreamSourceIcon}
                weight="regular"
              />
            )}
          </Flex>
        </Popover.Target>

        <Popover.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {source ? (
            <Stack gap="sm">
              <Group
                justify="space-between"
                align="center"
                w={"100%"}
                wrap="nowrap"
              >
                <Text fw={500} c="dark.3">
                  {source.displayName}
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
                  <Link to={`/source/${sourceId}`}>
                    <ActionIcon
                      title="Open Source"
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
              {source.analysis?.abstract && (
                <Text size="sm">{source.analysis.abstract}</Text>
              )}
            </Stack>
          ) : !hasAccess ? (
            <Stack gap="sm" align="center">
              <ShieldSlashIcon
                size={32}
                weight="regular"
                color="var(--mantine-color-dimmed)"
              />
              <Text c="dimmed" size="sm" ta="center">
                You don't have access to preview this source
              </Text>
              <Link to={`/source/${sourceId}`}>
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
              Could not find source :/
            </Text>
          )}
        </Popover.Dropdown>
      </Popover>

      <Link
        to={`/source/${source?.id.toString()}`}
        className={styles.dreamSourceInline}
      >
        <NodeViewContent
          className={`${styles.dreamSourceContent} ${!source ? styles.notFound : ""}`}
          data-placeholder={
            isEmpty ? source?.displayName || "Loading title..." : undefined
          }
          title={`Go to "${source?.displayName}"`}
        />
      </Link>
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
