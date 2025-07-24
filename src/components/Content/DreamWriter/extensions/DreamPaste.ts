import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser } from "@tiptap/pm/model";
import { marked } from "marked";

export const DreamPaste = Extension.create({
  name: "dreamPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("dream-paste"),
        props: {
          handlePaste: (view, event) => {
            const { selection } = view.state;

            if (selection.$from.parent.type.spec.code) {
              return false;
            }

            if (event.clipboardData?.getData("text/html")) {
              return false;
            }

            if (event.defaultPrevented) {
              return false;
            }

            const text = event.clipboardData?.getData("text/plain");

            if (!text) {
              return false;
            }

            const html = marked.parse(text, { async: false }) as string;

            const parser = DOMParser.fromSchema(view.state.schema);
            const domNode = document.createElement("div");
            domNode.innerHTML = html.trim();
            const newSlice = parser.parseSlice(domNode);

            if (newSlice.content.size === 0) {
              return false;
            }

            event.preventDefault();

            const { tr } = view.state;
            tr.replaceSelection(newSlice);
            tr.scrollIntoView();
            view.dispatch(tr);

            return true;
          },
        },
      }),
    ];
  },
});
