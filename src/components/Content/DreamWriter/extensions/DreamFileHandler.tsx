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
    console.log("Uploading file: ", file);
    const formData = new FormData();
    formData.append("userFile", file);
    const response = await api.post("/files/", formData);
    return response.data.data as UploadResponse;
  } catch (error) {
    console.error(error);
    return undefined;
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
    const editor = this.editor;

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

      uploadFile(file).then((response) => {
        console.log("Got uploaded response: ", response);
        editor.view.dispatch(editor.view.state.tr.scrollIntoView());
        if (!response) {
          console.error("Failed to upload file");
          return;
        }

        if (response.mimeType.startsWith("image/")) {
          console.log("Setting dream image");
          editor
            .chain()
            .focus()
            .setDreamImage({
              src: streamImageEndpoint(response),
              alt: response.originalFileName,
              title: response.originalFileName,
            })
            .run();
        } else {
          console.log("Setting dream file");
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
