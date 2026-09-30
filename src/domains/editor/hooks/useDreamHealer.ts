import { Editor } from "@tiptap/react";
import { useEffect } from "react";
import { api } from "@infrastructure/api/client";
import { debounce } from "lodash";

/**
 * Scans the editor content for:
 * 1. DreamImage/DreamFile nodes -> Ensures "embedded_within" edge
 * 2. DreamIdea/DreamTask/DreamSource nodes -> Ensures "connected" edge
 *
 * This acts as an automatic migration/repair tool ("The Healer")
 * that runs when the editor content changes to ensure the Graph DB matches the Editor State.
 */
export const useDreamHealer = (
  editor: Editor | undefined,
  connectableId: string | undefined,
  isReady: boolean
) => {
  useEffect(() => {
    if (!editor || !connectableId || !isReady) return;

    const healConnections = debounce(() => {
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
          node.type.name === "dreamSource" ||
          node.type.name === "dreamTransclusion"
        ) {
          const id =
            node.attrs.ideaId ||
            node.attrs.taskId ||
            node.attrs.sourceId ||
            node.attrs.connectableId;

          if (id) {
            connectionIds.add(id);
          }
        }
      });

      if (fileIds.size > 0) {
        api
          .post("/files/ensure-embedded", {
            connectableId: connectableId,
            fileIds: Array.from(fileIds),
          })
          .catch((err) => {
            console.warn("Dream file healing failed", err);
          });
      }

      if (connectionIds.size > 0) {
        api
          .post("/graph/ensure-connected", {
            source: connectableId,
            targets: Array.from(connectionIds),
          })
          .catch((err) => {
            console.warn("Dream connection healing failed", err);
          });
      }
    }, 2000); // Debounce time in milliseconds

    healConnections();

    // Cleanup the debounced function
    return () => {
      healConnections.cancel();
    };
  }, [editor, connectableId, isReady, editor?.state.doc]);
};
