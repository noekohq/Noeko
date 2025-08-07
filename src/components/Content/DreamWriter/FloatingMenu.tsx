import {
  Editor as IEditor,
  FloatingMenu as TippyFloatingMenu,
} from "@tiptap/react";
import { useState } from "react";
import styles from "./DreamWriter.module.scss";
import { PlusIcon } from "@phosphor-icons/react";

export default function FloatingMenu({ editor }: { editor: IEditor | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <TippyFloatingMenu className={styles.floatingMenu} editor={editor}>
      {menuOpen && <div className={styles.menu}>Coming soon...</div>}
      <button
        className={`btn-subtle ${styles.menuButton} ${
          menuOpen ? styles.active : ""
        }`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <PlusIcon weight="regular" />
      </button>
    </TippyFloatingMenu>
  );
}
