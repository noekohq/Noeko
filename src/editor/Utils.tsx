import React, { useEffect, useState } from "react";
import { Editor as IEditor } from "@tiptap/react";

type UtilityProps = {
  editor: IEditor | null;
};

export function useLink({ editor }: UtilityProps) {
  const isLink = editor?.isActive("link");

  const toggleLink = () => {
    if (isLink) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().blur().run();
      const selection = editor?.view.state.selection;
      const state = editor?.view.state;
      if (!selection || !state) {
        return;
      }
      const { to, from } = selection;
      const text = state.doc.textBetween(from, to);
      window.alert(`Work in progress: ` + text);
    }
  };

  return {
    isLink,
    toggleLink,
  };
}
