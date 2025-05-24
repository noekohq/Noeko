import React, { useEffect } from "react";

export type IShortcut = {
  run: () => void;
  keys: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    key?: string;
    code?: string;
  };
};

type IUseShortcutProps = {
  shortcuts: IShortcut[];
};

export default function useShortcuts({ shortcuts }: IUseShortcutProps) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const { ctrl, meta, shift, key, code } = shortcut.keys;

        if (!key && !code) {
          return;
        }

        const ctrlMatch = ctrl === undefined || ctrl === event.ctrlKey;
        const metaMatch = meta === undefined || meta === event.metaKey;
        const shiftMatch = shift === undefined || shift === event.shiftKey;

        const codeMatch = code
          ? event.code.toLowerCase() === code.toLowerCase()
          : false;
        const keyMatch = key
          ? event.key.toLowerCase() === key.toLowerCase()
          : false;

        if (ctrlMatch && metaMatch && shiftMatch && (codeMatch || keyMatch)) {
          shortcut.run();
          return;
        }
      });
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [shortcuts]);
}
