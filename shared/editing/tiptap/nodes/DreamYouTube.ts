import { mergeAttributes, Node, NodeConfig } from "@tiptap/core";
import { YOUTUBE_URL_REGEX } from "../../../vars/regex";

export interface IDreamYouTubeOptions {
  HTMLAttributes: Record<string, any>;
}

export type IDreamYouTubeAttributes = {
  src: string | null;
  start?: number;
};

export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  const match = YOUTUBE_URL_REGEX.exec(url);

  const videoId = match ? match[1] : null;

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return null;
}

export const DreamYouTubeSchema = Node.create({
  name: "dreamYouTube",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes(): { [K in keyof IDreamYouTubeAttributes]: {} } {
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
});
