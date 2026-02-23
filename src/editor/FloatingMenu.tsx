import { FloatingMenu as TippyFloatingMenu } from "@tiptap/react/menus";
import { Editor as IEditor } from "@tiptap/react";
import { useState } from "react";
import styles from "./FloatingMenu.module.scss";
import { PlusIcon } from "@phosphor-icons/react";
import { Group } from "@mantine/core";
import { PasteButton } from "./Options";

export default function FloatingMenu({ editor }: { editor: IEditor | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <TippyFloatingMenu className={styles.floatingMenu} editor={editor}>
      {menuOpen && (
        <div className={styles.menu}>
          <Group gap="xs">
            <PasteButton visible={menuOpen} editor={editor} />
          </Group>
        </div>
      )}
      <button
        className={`btn-subtle ${styles.menuButton} ${menuOpen ? styles.active : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <PlusIcon weight="regular" />
      </button>
    </TippyFloatingMenu>
  );
}
