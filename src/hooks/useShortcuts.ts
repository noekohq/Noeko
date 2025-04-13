import React, { useEffect } from "react";

export type Shortcut = {
  run: () => void;
  keys: { ctrl?: boolean; meta?: boolean; key: string };
};

type UseShortcutProps = {
  shortcuts: Shortcut[];
};

export default function useShortcuts({ shortcuts }: UseShortcutProps) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const { ctrl, meta, key } = shortcut.keys;
        if (
          (ctrl === undefined || ctrl === event.ctrlKey) &&
          (meta === undefined || meta === event.metaKey) &&
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
