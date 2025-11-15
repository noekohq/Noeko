import {
  Node,
  NodeViewProps,
  mergeAttributes,
  Editor as IEditor,
} from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useCallback, useRef } from "react";
import styles from "./styles/DreamImage.module.scss";
import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { ResizeIcon, TrashIcon } from "@phosphor-icons/react";
import {
  DreamImageSchema,
  IDreamImageOptions,
} from "../../../../../shared/editing/tiptap/nodes/DreamImage";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamImage: {
      /**
       * Add a custom image node
       */
      setDreamImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string | number;
        height?: string | number;
      }) => ReturnType;
    };
  }
}

export const DreamImage = DreamImageSchema.extend({
  addOptions() {
    return {
      HTMLAttributes: {
        class: styles.dreamImageWrapper,
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(DreamImageComponent);
  },
});

export const DreamImageComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const updateFunc = updateAttributes;

      if (!imgRef.current) {
        return;
      }
      const startX = event.clientX;
      const startWidth = imgRef.current.offsetWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const currentX = e.clientX;
        const newWidth = startWidth + (currentX - startX);
        if (imgRef.current) {
          imgRef.current.style.width = `${newWidth}px`;
          imgRef.current.style.height = "auto";
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        if (imgRef.current) {
          updateFunc({ width: imgRef.current.style.width });
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper
      className={styles.dreamImageWrapper}
      data-selected={selected}
    >
      <img
        {...node.attrs}
        ref={imgRef}
        className={styles.dreamImage}
        draggable="true"
        data-drag-handle
        style={{
          width: node.attrs.width,
          height: node.attrs.height,
        }}
      />
      {selected && (
        <div
          className={`${styles.resizeHandle}`}
          onMouseDown={(e) => handleResize(e)}
          title="Resize"
        />
      )}
    </NodeViewWrapper>
  );
};

interface IDreamImageMenuProps {
  editor: IEditor;
}

export const DreamImageMenu = ({ editor }: IDreamImageMenuProps) => {
  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamImage").run();
  };

  const restoreSizeToDefault = () => {
    editor
      .chain()
      .focus()
      .updateAttributes("dreamImage", {
        width: "100%",
        height: "auto",
      })
      .run();
  };

  return (
    <>
      <Stack>
        <Group gap="xs">
          <ActionIcon
            title="Remove this image"
            variant="light"
            radius="sm"
            color="dark.1"
            onClick={deleteSelectedNode}
          >
            <TrashIcon />
          </ActionIcon>
          <ActionIcon
            title="Restore size to default"
            variant="light"
            radius="sm"
            color="dark.1"
            onClick={restoreSizeToDefault}
          >
            <ResizeIcon />
          </ActionIcon>
        </Group>
      </Stack>
    </>
  );
};
