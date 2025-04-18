import React, { useEffect } from "react";

export type IShortcut = {
  run: () => void;
  keys: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    key?: string;
  };
};

type IUseShortcutProps = {
  shortcuts: IShortcut[];
};

export default function useShortcuts({ shortcuts }: IUseShortcutProps) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const { ctrl, meta, shift, key } = shortcut.keys;
        console.log("Key: ", event.key);
        if (
          (ctrl === undefined || ctrl === event.ctrlKey) &&
          (meta === undefined || meta === event.metaKey) &&
          (shift === undefined || shift === event.shiftKey) &&
          event.key === key
        ) {
          event.preventDefault();
          shortcut.run();
        }
      });
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [shortcuts]);
}
