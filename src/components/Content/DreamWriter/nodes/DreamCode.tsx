import { Node, NodeViewProps, mergeAttributes } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import styles from "./styles/DreamCode.module.scss";
import { useState } from "react";
import { ActionIcon, CopyButton, Group } from "@mantine/core";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

export const DreamCode = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamCodeNodeView);
  },
});

const DreamCodeNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
}) => {
  const [hovering, setHovering] = useState(false);

  return (
    <NodeViewWrapper
      as="pre"
      className={styles.container}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering && (
        <div className={styles.ui}>
          <Group justify="right">
            <CopyButton value={node.textContent}>
              {({ copied, copy }) => (
                <ActionIcon onClick={copy} size="md" variant="default">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </ActionIcon>
              )}
            </CopyButton>
          </Group>
        </div>
      )}
      <NodeViewContent as="code" className={styles.code} />
    </NodeViewWrapper>
  );
};
