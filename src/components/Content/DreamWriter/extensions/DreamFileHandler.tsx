import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { linkFileToConnectable } from '@/utils/userfiles';
import { uploadDreamFile, DreamUploadOptions } from "../lib/utils/fileUpload";

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

  onCreate() {
    // Store the extension instance for use in plugins
    (this as any).extensionInstance = this;
  },

  addProseMirrorPlugins() {
    const extension = this;
    const editor = this.editor;

    const uploadPlugin = new Plugin({
      key: new PluginKey("dreamFileUpload"),
      props: {
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          let fileFound = false;
          const files: File[] = [];

          for (let i = 0; i < items.length; i++) {
            const file = items[i].getAsFile();
            if (file) {
              files.push(file);
              fileFound = true;
            }
          }

          if (fileFound) {
            event.preventDefault();
            files.forEach((file) => {
              handleFileUpload(file, this.options, editor);
            });
          }

          return fileFound;
        },
        handleDrop: (view, event) => {
          const items = event.dataTransfer?.items;
          if (!items) return false;

          let fileFound = false;
          const files: File[] = [];

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === "file") {
              const file = item.getAsFile();
              if (file) {
                files.push(file);
                fileFound = true;
              }
            }
          }

          if (fileFound) {
            event.preventDefault();
            files.forEach((file) => {
              handleFileUpload(file, this.options, editor);
            });
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
            const diff = new Set([...newIds].filter((id) => !pluginState.ids.has(id)));

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
export const handleFileUpload = (file: File, options: DreamUploadOptions, editor: Editor) => {
  uploadDreamFile(file, editor, options, { type: "cursor" });
};
