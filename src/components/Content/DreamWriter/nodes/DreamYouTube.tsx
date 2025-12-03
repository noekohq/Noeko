import {
  Node,
  mergeAttributes,
  nodeInputRule,
  NodeViewProps,
  PasteRule,
  nodePasteRule,
} from "@tiptap/core";
import { Editor as IEditor } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import styles from "./styles/DreamYouTube.module.scss";
import { ActionIcon, Group } from "@mantine/core";
import { TrashIcon } from "@phosphor-icons/react";
import { YOUTUBE_URL_REGEX } from "../../../../../shared/vars/regex";
import {
  IDreamYouTubeAttributes,
  IDreamYouTubeOptions,
  DreamYouTubeSchema,
  getYoutubeEmbedUrl,
} from "../../../../../shared/editing/tiptap/nodes/DreamYouTube";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamYouTube: {
      setDreamYouTubeVideo: (options: {
        src: string;
        start?: number;
      }) => ReturnType;
    };
  }
}

const DreamYouTubeComponent: React.FC<NodeViewProps> = ({ node, selected }) => {
  const { src, start } = node.attrs;

  const finalSrc = new URL(src);
  if (start > 0) {
    finalSrc.searchParams.set("start", String(start));
  }

  return (
    <NodeViewWrapper data-drag-handle>
      <div
        data-dream-youtube-video=""
        data-selected={selected}
        className={styles.youtubeWrapper}
      >
        <iframe
          src={finalSrc.toString()}
          data-start={start}
          allowFullScreen
          title="Embedded YouTube Video"
        ></iframe>
      </div>
    </NodeViewWrapper>
  );
};

export const DreamYouTube = DreamYouTubeSchema.extend({
  addInputRules() {
    return [
      nodeInputRule({
        find: YOUTUBE_URL_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const embedUrl = getYoutubeEmbedUrl(match[0]);
          return embedUrl ? { src: embedUrl } : false;
        },
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DreamYouTubeComponent);
  },
});

export function DreamYouTubeMenu({ editor }: { editor: IEditor }) {
  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamYouTube").run();
  };

  return (
    <Group>
      <Group gap="xs">
        <ActionIcon
          title="Remove this YouTube video"
          variant="light"
          radius="sm"
          color="dark.1"
          onClick={deleteSelectedNode}
        >
          <TrashIcon />
        </ActionIcon>
      </Group>
    </Group>
  );
}
