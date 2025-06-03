import { useState, useRef, useEffect } from "react";
import { useInteraction } from "../../../contexts/InteractionContext";
import { createPortal } from "react-dom";
import styles from "./Spotlight.module.scss";

export type ISpyglassSubview = {
  id: string;
  title: string;
  icon: string;
  onClick: () => void;
};

export default function Spotlight() {
  const {
    state: { spotlightOpened },
    actions: {
      layout: {
        spotlight: { close: closeSpotlight },
      },
    },
  } = useInteraction();

  const spotlightRef = useRef<HTMLInputElement>(null);

  const [spotlightValue, setSpotlightValue] = useState("");

  useEffect(() => {
    if (spotlightOpened && spotlightRef.current) {
      setSpotlightValue("");
      spotlightRef.current.focus();
    }
  }, [spotlightOpened]);

  if (!spotlightOpened) {
    return null;
  }

  return createPortal(
    <div className={styles.spotlightOverlay} onClick={closeSpotlight}>
      <div className={styles.spotlight} onClick={(e) => e.stopPropagation()}>
        <input
          className={styles.input}
          type="text"
          value={spotlightValue}
          onChange={(e) => setSpotlightValue(e.target.value)}
          ref={spotlightRef}
          placeholder="Search for anything..."
        />
      </div>
    </div>,
    document.body,
  );
}
