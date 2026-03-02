import { Editor } from "@tiptap/react";
import {
  uploadFileSmart,
  linkFileToConnectable,
  UploadCallbacks,
} from "@infrastructure/api/userfiles";
import { streamImageEndpoint } from "@/core/vars/files";

// --- TYPES & INTERFACES ---

export interface DreamUploadOptions {
  allowedTypes?: string[];
  connectableId?: string;
}

export interface InsertPosition {
  type: "cursor" | "pos";
  pos?: number;
}

export interface UploadedFileData {
  fileId: string;
  fileName: string;
  fileType: string;
  isImage: boolean;
  src: string;
}

// ==========================================
// EDITOR-INTEGRATED UPLOADS
// ==========================================

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

  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
 * Batch upload multiple files to the editor
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

// ==========================================
// HEADLESS UPLOADS
// ==========================================

/**
 * Uploads a file headlessly (without creating editor nodes).
 * Returns a promise that resolves with the uploaded file data.
 *
 * This is useful for:
 * - Gallery uploads where you need the URL to store in attributes
 * - Custom handling of uploaded files outside of Tiptap
 */
export const uploadDreamFileHeadless = (
  file: File,
  options: DreamUploadOptions = {},
  callbacks?: UploadCallbacks
): Promise<UploadedFileData> => {
  return new Promise((resolve, reject) => {
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      const errorMsg = `File type ${file.type} is not allowed.`;
      if (options.connectableId) {
        console.error(errorMsg);
      } else {
        window.alert(errorMsg);
      }
      reject(new Error(errorMsg));
      return;
    }

    const isImage = file.type.startsWith("image/");

    uploadFileSmart(file, {
      onProgress: (percent) => {
        callbacks?.onProgress?.(percent);
      },
      onSuccess: (remoteFile) => {
        const uploadedData: UploadedFileData = {
          fileId: remoteFile.id.toString(),
          fileName: remoteFile.originalFileName || file.name,
          fileType: remoteFile.mimeType || file.type,
          isImage,
          src: isImage ? streamImageEndpoint(remoteFile) : "",
        };

        // Link to connectable if provided
        if (options.connectableId) {
          linkFileToConnectable(remoteFile.id.toString(), options.connectableId);
        }

        callbacks?.onSuccess?.(remoteFile);
        resolve(uploadedData);
      },
      onError: (errorMessage) => {
        callbacks?.onError?.(errorMessage);
        reject(new Error(errorMessage));
      },
    });
  });
};

/**
 * Uploads multiple files headlessly.
 * Returns a promise that resolves with an array of uploaded file data.
 */
export const uploadDreamFilesHeadless = (
  files: File[],
  options: DreamUploadOptions = {},
  callbacks?: UploadCallbacks & {
    onFileProgress?: (fileIndex: number, percent: number) => void;
  }
): Promise<UploadedFileData[]> => {
  const promises = files.map((file, index) => {
    return uploadDreamFileHeadless(file, options, {
      onProgress: (percent) => callbacks?.onFileProgress?.(index, percent),
      onSuccess: callbacks?.onSuccess,
      onError: callbacks?.onError,
    });
  });

  return Promise.all(promises);
};
