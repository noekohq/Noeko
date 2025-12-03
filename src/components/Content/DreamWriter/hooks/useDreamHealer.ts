import { Editor } from "@tiptap/react";
import { useEffect } from "react";
import { api } from "../../../../server/api";

/**
 * Scans the editor content for:
 * 1. DreamImage/DreamFile nodes -> Ensures "embedded_within" edge
 * 2. DreamIdea/DreamTask/DreamSource nodes -> Ensures "connected" edge
 *
 * This acts as an automatic migration/repair tool ("The Healer")
 * that runs once when the editor loads to ensure the Graph DB matches the Editor State.
 */
export const useDreamHealer = (
  editor: Editor | undefined,
  connectableId: string | undefined,
  isReady: boolean,
) => {
  useEffect(() => {
    if (!editor || !connectableId) return;

    const fileIds = new Set<string>();
    const connectionIds = new Set<string>();

    editor.state.doc.descendants((node) => {
      if (node.type.name === "dreamImage" || node.type.name === "dreamFile") {
        if (node.attrs.fileId) {
          fileIds.add(node.attrs.fileId);
        }
      }

      if (
        node.type.name === "dreamIdea" ||
        node.type.name === "dreamTask" ||
        node.type.name === "dreamSource"
      ) {
        const id =
          node.attrs.ideaId || node.attrs.taskId || node.attrs.sourceId;

        if (id) {
          connectionIds.add(id);
        }
      }
    });

    const timers: NodeJS.Timeout[] = [];

    if (fileIds.size > 0) {
      const fileTimer = setTimeout(() => {
        console.log(`Healing dream embeddings for ${fileIds.size} files...`);
        api
          .post("/files/ensure-embedded", {
            connectableId: connectableId,
            fileIds: Array.from(fileIds),
          })
          .catch((err) => {
            console.warn("Dream file healing failed", err);
          });
      }, 1000);
      timers.push(fileTimer);
    }

    if (connectionIds.size > 0) {
      const connectionTimer = setTimeout(() => {
        console.log(
          `Healing dream connections for ${connectionIds.size} nodes...`,
        );
        api
          .post("/graph/ensure-connected", {
            source: connectableId,
            targets: Array.from(connectionIds),
          })
          .catch((err) => {
            console.warn("Dream connection healing failed", err);
          });
      }, 1200);
      timers.push(connectionTimer);
    }

    // Cleanup all timers
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [editor, connectableId, isReady]);
};
