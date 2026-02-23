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
import styles from '@core/design/styles/DreamSource.module.scss';
import { ActionIcon, Flex, Group, Popover, Stack, Text, Tooltip } from "@mantine/core";
import { Link, useNavigate } from "react-router";
import useFetch from '@/hooks/useFetch';
import { ISource } from '../../../app/database/models/source';
import { DreamSourceSchema } from '../../../shared/editing/tiptap/nodes/DreamSource';
import { useDisclosure } from "@mantine/hooks";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamSource: {
      setDreamSource: (options: { sourceId: string; content: string }) => ReturnType;
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

export const DreamSourceComponent: React.FC<NodeViewProps> = ({ node, deleteNode, selected }) => {
  const { sourceId } = node.attrs;
  const isEmpty = node.content.size === 0;
  const [accessState, setAccessState] = useState<"granted" | "forbidden" | "error">("granted");
  const navigate = useNavigate();

  const { data: source, load: fetchSource } = useFetch<undefined, ISource>({
    url: `/sources/${sourceId}`,
    skip403Redirect: true,
    onError: (error) => {
      console.error("Error getting source to connect: ", error);
      if ((error as any)?.response?.status === 403) {
        setAccessState("forbidden");
      } else {
        setAccessState("error");
      }
    },
  });

  useEffect(() => {
    fetchSource();
  }, [sourceId]);

  const [iconHovered, { toggle }] = useDisclosure(false);

  const handleLinkClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    // Standard behavior for opening in a new tab
    if (event.metaKey || event.ctrlKey) {
      window.open(`/source/${sourceId}`, "_blank");
      return;
    }
    navigate(`/source/${sourceId}`);
  };

  const getTooltipLabel = () => {
    switch (accessState) {
      case "granted":
        return source?.displayName ? `Preview ${source.displayName}` : "Loading...";
      case "forbidden":
        return "You don't have access to preview this source";
      case "error":
        return "Could not load source preview";
      default:
        return "Loading...";
    }
  };

  if (!sourceId) {
    return <span className={styles.dreamSourceError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamSourceWrapper}
      data-selected={selected || undefined}
    >
      <Popover width={"400px"} shadow="md" position="top" radius="lg" opened={iconHovered}>
        <Popover.Target>
          <Tooltip label={getTooltipLabel()}>
            <Flex
              className={styles.iconWrapper}
              align={"center"}
              justify={"center"}
              onClick={() => {
                toggle();
              }}
            >
              {accessState === "granted" ? (
                <FileTextIcon
                  className={`${styles.dreamSourceIcon} ${iconHovered ? styles.hovered : ""}`}
                  weight={iconHovered ? "fill" : "regular"}
                />
              ) : (
                <ShieldSlashIcon
                  className={`${styles.dreamSourceIcon} ${styles.shieldIcon}`}
                  weight="fill"
                />
              )}
            </Flex>
          </Tooltip>
        </Popover.Target>

        <Popover.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {accessState === "granted" && source && (
            <Stack gap="sm">
              <Group justify="space-between" align="center" w={"100%"} wrap="nowrap">
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
              {source.analysis?.abstract && <Text size="sm">{source.analysis.abstract}</Text>}
            </Stack>
          )}

          {accessState === "granted" && !source && (
            <Text c="dimmed" size="xs">
              Loading preview...
            </Text>
          )}

          {accessState === "forbidden" && (
            <Stack gap="sm" align="center">
              <ShieldSlashIcon size={32} weight="regular" color="var(--mantine-color-dimmed)" />
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
          )}

          {accessState === "error" && (
            <Stack gap="sm" align="center">
              <Text c="dimmed" size="sm" ta="center">
                Could not load source preview.
              </Text>
            </Stack>
          )}
        </Popover.Dropdown>
      </Popover>

      <span onClick={handleLinkClick} className={styles.dreamSourceInline} role="link">
        <NodeViewContent
          className={`${styles.dreamSourceContent} ${
            !source && accessState === "granted" ? styles.notFound : ""
          }`}
          data-placeholder={isEmpty ? source?.displayName || "Loading title..." : undefined}
          title={source?.displayName ? `Go to "${source.displayName}"` : "Go to source"}
        />
      </span>
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
      <ActionIcon title="Delete Source" color="red" onClick={deleteSelectedNode}>
        <TrashIcon />
      </ActionIcon>
    </>
  );
};
