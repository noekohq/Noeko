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
import { YOUTUBE_URL_REGEX } from "../../../../vars/regex";

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

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  const match = YOUTUBE_URL_REGEX.exec(url);

  const videoId = match ? match[1] : null;

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return null;
}

export interface DreamYouTubeOptions {
  HTMLAttributes: Record<string, any>;
}

type DreamYouTubeAttributes = {
  src: string | null;
  start?: number;
};

const DreamYouTubeComponent: React.FC<NodeViewProps> = ({ node, selected }) => {
  const { src, start } = node.attrs;

  console.log("Constructing: ", src);
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

export const DreamYouTube = Node.create<DreamYouTubeOptions>({
  name: "dreamYouTube",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: styles.youtubeWrapper,
      },
    };
  },

  addAttributes(): { [K in keyof DreamYouTubeAttributes]: {} } {
    return {
      src: {
        default: null,
      },
      start: {
        default: 0,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-dream-youtube-video]",
        getAttrs: (dom: HTMLElement) => {
          const iframe = dom.querySelector("iframe");
          if (!iframe) {
            return false;
          }

          return {
            src: iframe.getAttribute("src"),
            start: iframe.getAttribute("data-start"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const embedUrl = HTMLAttributes.src as string;
    if (!embedUrl) {
      return ["div", { "data-dream-youtube-video-invalid": "" }];
    }

    const finalSrc = new URL(embedUrl);
    if (HTMLAttributes.start > 0) {
      finalSrc.searchParams.set("start", String(HTMLAttributes.start));
    }

    const iframeAttrs = mergeAttributes(this.options.HTMLAttributes, {
      src: finalSrc.toString(),
      "data-start": HTMLAttributes.start,
      frameborder: 0,
      allowfullscreen: "true",
      title: "Embedded YouTube Video",
    });

    return ["div", { "data-dream-youtube-video": "" }, ["iframe", iframeAttrs]];
  },

  addCommands() {
    return {
      setDreamYouTubeVideo:
        (options) =>
        ({ commands }) => {
          const embedUrl = getYoutubeEmbedUrl(options.src);
          if (!embedUrl) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: { ...options, src: embedUrl },
          });
        },
    };
  },

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
