import { Editor } from "@tiptap/react";
import {
  uploadFileSmart,
  linkFileToConnectable,
  UploadCallbacks,
} from '@/utils/userfiles';
import { streamImageEndpoint } from '@/vars/files';

export interface DreamUploadOptions {
  allowedTypes?: string[];
  connectableId?: string;
}

export interface InsertPosition {
  type: "cursor" | "pos";
  pos?: number;
}

/**
 * Uploads a file and handles the full lifecycle including:
 * - Creating a temporary preview node
 * - Uploading the file
 * - Updating the node with the remote file info
 * - Linking to connectable if provided
 * - Cleaning up object URLs
 */
export const uploadDreamFile = (
  file: File,
  editor: Editor,
  options: DreamUploadOptions,
  insertPosition: InsertPosition = { type: "cursor" },
  callbacks?: UploadCallbacks
): string => {
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    const errorMsg = `File type ${file.type} is not allowed.`;
    if (options.connectableId) {
      console.error(errorMsg);
    } else {
      window.alert(errorMsg);
    }
    return "";
  }

  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const isImage = file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(file) : "";

  const nodeContent = isImage
    ? {
        type: "dreamImage",
        attrs: {
          src: previewUrl,
          fileId: tempId,
          uploading: true,
          progress: 0,
          error: null,
          alt: file.name,
          viewMode: "expanded" as const,
        },
      }
    : {
        type: "dreamFile",
        attrs: {
          fileId: tempId,
          fileName: file.name,
          fileType: file.type,
          uploading: true,
          progress: 0,
          error: null,
          viewMode: "expanded" as const,
        },
      };

  if (insertPosition.type === "cursor") {
    const { to } = editor.state.selection;
    editor.chain().focus().insertContentAt(to, nodeContent).run();
  } else if (insertPosition.type === "pos" && typeof insertPosition.pos === "number") {
    editor.chain().insertContentAt(insertPosition.pos, nodeContent).run();
  }

  uploadFileSmart(file, {
    onProgress: (percent) => {
      updateDreamNodeAttrs(editor, tempId, { progress: percent });
      callbacks?.onProgress?.(percent);
    },
    onSuccess: (remoteFile) => {
      if (isImage) {
        updateDreamNodeAttrs(editor, tempId, {
          uploading: false,
          progress: 100,
          fileId: remoteFile.id.toString(),
          src: streamImageEndpoint(remoteFile),
          error: null,
        });
      } else {
        updateDreamNodeAttrs(editor, tempId, {
          uploading: false,
          progress: 100,
          fileId: remoteFile.id.toString(),
          error: null,
        });
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (options.connectableId) {
        linkFileToConnectable(remoteFile.id.toString(), options.connectableId);
      }

      callbacks?.onSuccess?.(remoteFile);
    },
    onError: (errorMessage) => {
      updateDreamNodeAttrs(editor, tempId, {
        uploading: false,
        error: errorMessage,
      });
      callbacks?.onError?.(errorMessage);
    },
  });

  return tempId;
};

/**
 * Helper: Finds a node by fileId and updates its attributes.
 * This is crucial because async uploads mean the node position might have changed.
 */
export const updateDreamNodeAttrs = (editor: Editor, fileId: string, attrs: any) => {
  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.fileId === fileId) {
      // We use a transaction to update the node at its current position
      const transaction = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs,
      });
      editor.view.dispatch(transaction);
      return false;
    }
    return true;
  });
};

/**
 * Batch upload multiple files
 */
export const uploadDreamFiles = (
  files: File[],
  editor: Editor,
  options: DreamUploadOptions,
  insertPosition: InsertPosition = { type: "cursor" },
  callbacks?: UploadCallbacks
): string[] => {
  const tempIds: string[] = [];
  let currentPos =
    insertPosition.type === "pos" && typeof insertPosition.pos === "number"
      ? insertPosition.pos
      : editor.state.selection.to;

  files.forEach((file) => {
    const position: InsertPosition = {
      type: "pos",
      pos: currentPos,
    };

    const tempId = uploadDreamFile(file, editor, options, position, callbacks);
    if (tempId) {
      tempIds.push(tempId);
      // Increment position for the next file in the batch
      currentPos += 1;
    }
  });

  return tempIds;
};
