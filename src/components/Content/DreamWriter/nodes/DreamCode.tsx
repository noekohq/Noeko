import { NodeViewProps } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import styles from "./styles/DreamCode.module.scss";
import { useState } from "react";
import { ActionIcon, CopyButton, Group, Select } from "@mantine/core"; // Import Select
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { capitalize } from "../../../../utils/formatting";
import { DreamCodeSchema } from "../../../../../shared/editing/tiptap/nodes/DreamCode";

export const DreamCode = DreamCodeSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamCodeNodeView, {
      contentDOMElementTag: "code",
    });
  },
});

const DreamCodeNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
  extension,
}) => {
  const [hovering, setHovering] = useState(false);

  const languages = extension.options.lowlight.listLanguages();

  return (
    <NodeViewWrapper
      as="pre"
      className={styles.container}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering && (
        <div className={styles.ui} contentEditable={false}>
          <Group justify="right" gap="xs">
            <Select
              size="xs"
              placeholder="Auto"
              variant="filled"
              styles={{
                input: {
                  backgroundColor: "var(--mantine-color-dark-7) !important",
                  border: "1px solid var(--mantine-color-dark-7)",
                  borderRadius: "var(--mantine-radius-md)",
                },
              }}
              data={[
                ...languages.map((lang: string) => ({
                  value: lang,
                  label: capitalize(lang),
                })),
                {
                  value: "auto",
                  label: "Auto",
                },
              ]}
              value={node.attrs.language}
              onChange={(language) => updateAttributes({ language })}
              onClick={(e) => e.stopPropagation()}
              searchable
            />
            <CopyButton value={node.textContent}>
              {({ copy, copied }) => {
                return (
                  <ActionIcon onClick={copy} size="md" variant="light" color="gray" radius="md">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </ActionIcon>
                );
              }}
            </CopyButton>
          </Group>
        </div>
      )}
      <pre className={styles.code}>
        <NodeViewContent spellCheck={false} />
      </pre>
    </NodeViewWrapper>
  );
};
