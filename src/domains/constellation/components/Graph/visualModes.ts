export const CONSTELLATION_VISUAL_MODES = ["depth", "classic", "static"] as const;

export type IConstellationVisualMode = (typeof CONSTELLATION_VISUAL_MODES)[number];

export const DEFAULT_CONSTELLATION_VISUAL_MODE: IConstellationVisualMode = "depth";
export const CONSTELLATION_VISUAL_MODE_STORAGE_KEY = "noeko:constellation-visual-mode";

export const isConstellationVisualMode = (
  value: string | null
): value is IConstellationVisualMode =>
  CONSTELLATION_VISUAL_MODES.includes(value as IConstellationVisualMode);
