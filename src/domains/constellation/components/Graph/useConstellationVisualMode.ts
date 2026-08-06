import { useCallback, useEffect, useState } from "react";
import {
  CONSTELLATION_VISUAL_MODE_STORAGE_KEY,
  DEFAULT_CONSTELLATION_VISUAL_MODE,
  isConstellationVisualMode,
  type IConstellationVisualMode,
} from "./visualModes";

const VISUAL_MODE_CHANGE_EVENT = "noeko:constellation-visual-mode-change";

const getSavedVisualMode = (): IConstellationVisualMode => {
  if (typeof window === "undefined") return DEFAULT_CONSTELLATION_VISUAL_MODE;
  try {
    const savedMode = window.localStorage.getItem(CONSTELLATION_VISUAL_MODE_STORAGE_KEY);
    return isConstellationVisualMode(savedMode) ? savedMode : DEFAULT_CONSTELLATION_VISUAL_MODE;
  } catch (error) {
    console.warn("Unable to read the saved Constellation visual mode:", error);
    return DEFAULT_CONSTELLATION_VISUAL_MODE;
  }
};

export const useConstellationVisualMode = () => {
  const [visualMode, setVisualModeState] = useState<IConstellationVisualMode>(getSavedVisualMode);

  const setVisualMode = useCallback((mode: IConstellationVisualMode) => {
    setVisualModeState(mode);
    window.dispatchEvent(new CustomEvent(VISUAL_MODE_CHANGE_EVENT, { detail: mode }));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CONSTELLATION_VISUAL_MODE_STORAGE_KEY, visualMode);
    } catch (error) {
      console.warn("Unable to save the Constellation visual mode:", error);
    }
    document.documentElement.dataset.constellationVisualMode = visualMode;
  }, [visualMode]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CONSTELLATION_VISUAL_MODE_STORAGE_KEY) return;
      setVisualModeState(
        isConstellationVisualMode(event.newValue)
          ? event.newValue
          : DEFAULT_CONSTELLATION_VISUAL_MODE
      );
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const handleVisualModeChange = (event: Event) => {
      const mode = (event as CustomEvent<IConstellationVisualMode>).detail;
      if (isConstellationVisualMode(mode)) setVisualModeState(mode);
    };
    window.addEventListener(VISUAL_MODE_CHANGE_EVENT, handleVisualModeChange);
    return () => window.removeEventListener(VISUAL_MODE_CHANGE_EVENT, handleVisualModeChange);
  }, []);

  return [visualMode, setVisualMode] as const;
};
