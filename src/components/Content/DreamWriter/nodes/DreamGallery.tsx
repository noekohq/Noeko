import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { DreamGallerySchema } from "../../../../../shared/editing/tiptap/nodes/DreamGallery";
import styles from "./styles/DreamGallery.module.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamGallery: {
      setDreamGallery: () => ReturnType;
    };
  }
}

export const DreamGallery = DreamGallerySchema.extend({
  addOptions() {
    return {
      HTMLAttributes: {
        class: styles.dreamGallery,
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(DreamGalleryComponent);
  },
});

export const DreamGalleryComponent: React.FC<NodeViewProps> = ({ node }) => {
  return (
    <NodeViewWrapper className={styles.dreamGallery}>
      <NodeViewContent className={styles.content} />
    </NodeViewWrapper>
  );
};
