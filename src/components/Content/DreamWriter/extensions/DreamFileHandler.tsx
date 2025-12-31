import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { api } from "../../../../server/api";
import { IUserFile } from "../../../../../app/database/models/userfile";
import { streamImageEndpoint } from "../../../../vars/files";
import { linkFileToConnectable } from "../../../../utils/userfiles";

type UploadResponse = IUserFile & {};

export interface DreamFileHandlerOptions {
  allowedTypes?: string[];
  connectableId: string;
}

interface SyncPluginState {
  ids: Set<string>;
  toLink: Set<string>;
}

// --- Helper Functions ---

const getFileIds = (doc: ProsemirrorNode): Set<string> => {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name === "dreamImage" || node.type.name === "dreamFile") {
      if (node.attrs.fileId) {
        ids.add(node.attrs.fileId);
      }
    }
  });
  return ids;
};

// --- Main Extension ---

export const DreamFileHandler = Extension.create<DreamFileHandlerOptions>({
  name: "dreamFileHandler",

  addOptions() {
    return {
      allowedTypes: undefined,
      connectableId: "",
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const editor = this.editor;

    // 1. Upload Plugin (Intercepts Paste/Drop of raw files)
    const uploadPlugin = new Plugin({
      key: new PluginKey("dreamFileUpload"),
      props: {
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          let fileFound = false;
          for (let i = 0; i < items.length; i++) {
            const file = items[i].getAsFile();
            if (file) {
              event.preventDefault();
              // Pass this.options to ensure we get current connectableId
              handleFileUpload(file, extension.options, editor);
              fileFound = true;
            }
          }
          return fileFound;
        },
        handleDrop: (view, event) => {
          const items = event.dataTransfer?.items;
          if (!items) return false;

          let fileFound = false;
          for (let i = 0; i < items.length; i++) {
            const file = items[i].getAsFile();
            if (file) {
              event.preventDefault();
              handleFileUpload(file, extension.options, editor);
              fileFound = true;
            }
          }
          return fileFound;
        },
      },
    });

    // 2. Sync Plugin (Detects EXISTING files being pasted/dropped from other notes)
    const syncPlugin = new Plugin<SyncPluginState>({
      key: new PluginKey("dreamFileSync"),
      state: {
        // INIT: Do nothing. The React Hook 'useDreamHealer' handles the initial state.
        init(_, state) {
          return {
            ids: getFileIds(state.doc), // We still need the initial IDs to diff against
            toLink: new Set(),
          };
        },

        // APPLY: Watch for changes
        apply(tr, pluginState, oldState, newState) {
          // If no doc change, ignore
          if (!tr.docChanged) return pluginState;

          // ONLY run logic if this was a specific UI event (Paste or Drop)
          // This prevents the plugin from firing on 'setContent' or random typing
          const uiEvent = tr.getMeta("uiEvent");
          const isPasteOrDrop = uiEvent === "paste" || uiEvent === "drop";

          const newIds = getFileIds(newState.doc);

          if (isPasteOrDrop) {
            // Calculate strictly NEW IDs
            const diff = new Set(
              [...newIds].filter((id) => !pluginState.ids.has(id)),
            );

            // Return new state with the items to link
            return { ids: newIds, toLink: diff };
          }

          // Just update the known IDs, don't trigger a link
          return { ids: newIds, toLink: new Set() };
        },
      },
      view(view) {
        return {
          update: (view, prevState) => {
            const connectableId = extension.options.connectableId;
            if (!connectableId) return;

            const state = syncPlugin.getState(view.state);

            // Only fire for the specific IDs identified in the paste/drop transaction
            state?.toLink.forEach((id) => {
              linkFileToConnectable(id, connectableId);
            });
          },
        };
      },
    });

    return [uploadPlugin, syncPlugin];
  },
});

// --- Upload Handler ---

export const handleFileUpload = (
  file: File,
  options: DreamFileHandlerOptions,
  editor: Editor,
) => {
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    console.warn(`File type not allowed: ${file.type}`);
    window.alert(`File type (${file.type}) is not allowed.`);
    return;
  }

  console.info(`Uploading ${file.name}...`);

  uploadFile(file, options.connectableId).then(async (response) => {
    editor.view.dispatch(editor.view.state.tr.scrollIntoView());
    if (!response) {
      console.error("Failed to upload file");
      return;
    }

    if (options.connectableId) {
      await linkFileToConnectable(
        response.id.toString(),
        options.connectableId,
      );
    }

    if (response.mimeType.startsWith("image/")) {
      editor
        .chain()
        .focus()
        .setDreamImage({
          src: streamImageEndpoint(response),
          alt: response.originalFileName,
          title: response.originalFileName,
          fileId: response.id.toString(),
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setDreamFile({
          fileId: response.id.toString(),
          fileName: response.originalFileName,
          fileType: response.mimeType,
        })
        .run();
    }
  });
};

// Kept mainly for the API call structure
export const uploadFile = async (file: File, connectableId?: string) => {
  try {
    const formData = new FormData();
    formData.append("userFile", file);
    const response = await api.post("/files", formData);
    return response.data.data as UploadResponse;
  } catch (error) {
    console.error(error);
    return undefined;
  }
};
