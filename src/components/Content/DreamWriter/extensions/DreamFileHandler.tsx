import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Editor } from "@tiptap/react";
import { api } from "../../../../server/api";
import { IUserFile } from "../../../../../app/database/models/userfile";
import { streamImageEndpoint } from "../../../../vars/files";

type UploadResponse = IUserFile & {};

export interface DreamFileHandlerOptions {
  allowedTypes?: string[];
}

export const uploadFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/files/", formData);
    return response.data as UploadResponse;
  } catch (error) {
    console.error(error);
  }
};

export const DreamFileHandler = Extension.create<DreamFileHandlerOptions>({
  name: "dreamFileHandler",

  addOptions() {
    return {
      allowedTypes: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const editor = this.editor as Editor;

    const handleFileUpload = (file: File) => {
      if (
        extension.options.allowedTypes &&
        !extension.options.allowedTypes.includes(file.type)
      ) {
        console.warn(`File type not allowed: ${file.type}`);
        window.alert(`File type (${file.type}) is not allowed.`);
        return;
      }

      console.info(`Uploading ${file.name}...`);
      console.info("Would have uploaded: ", file);

      uploadFile(file).then((response) => {
        editor.view.dispatch(editor.view.state.tr.scrollIntoView());
        if (!response) {
          console.error("Failed to upload file");
          return;
        }

        if (response.mimeType.startsWith("image/")) {
          editor
            .chain()
            .focus()
            .setDreamImage({
              src: streamImageEndpoint(response),
              alt: response.originalFileName,
              title: response.originalFileName,
            });
        } else {
          editor.chain().focus().setDreamFile({
            fileId: response.id.toString(),
            fileName: response.originalFileName,
            fileType: response.mimeType,
          });
        }
      });
    };

    return [
      new Plugin({
        key: new PluginKey("dreamFileHandler"),
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;

            let fileFound = false;
            for (let i = 0; i < items.length; i++) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                console.log("File: ", file);
                handleFileUpload(file);
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
                console.log("File: ", file);
                event.preventDefault();
                handleFileUpload(file);
                fileFound = true;
              }
            }
            return fileFound;
          },
        },
      }),
    ];
  },
});
