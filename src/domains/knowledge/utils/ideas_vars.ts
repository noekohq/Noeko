import { MantineColor } from "@mantine/core";

export type ISimilarityLevel =
  | "identical" // The thing itself or a direct copy
  | "very-similar" // Strong conceptual overlap
  | "similar" // Good context
  | "related" // Loose association / Faint signal
  | "different"; // Noise

const similarityLevels: ISimilarityLevel[] = [
  "identical",
  "very-similar",
  "similar",
  "related",
  "different",
];

// --- TUNING NOTES ---
// 1. IDENTICAL: Kept high. This is for detecting duplicates.
// 2. VERY SIMILAR: Lowered to 0.8. Direct paraphrases usually land here.
// 3. SIMILAR: Lowered to 0.6. This is usually the "sweet spot" for relevant content.
// 4. RELATED: Lowered drastically to 0.3.
//    Context: In high-dimensional vector space, a score of 0.3 often indicates
//    they share a domain (e.g., "Software" vs "Computer"), even if not the same topic.
const IDENTICAL_THRESHOLD = 0.98;
const VERY_SIMILAR_THRESHOLD = 0.8;
const SIMILAR_THRESHOLD = 0.6;
const RELATED_THRESHOLD = 0.3;

export const similarityToLevel = (similarity: number): ISimilarityLevel => {
  // Clamp similarity to the valid range [0, 1]
  const clampedSimilarity = Math.max(0, Math.min(1, similarity));

  if (clampedSimilarity >= IDENTICAL_THRESHOLD) return "identical";
  if (clampedSimilarity >= VERY_SIMILAR_THRESHOLD) return "very-similar";
  if (clampedSimilarity >= SIMILAR_THRESHOLD) return "similar";
  if (clampedSimilarity >= RELATED_THRESHOLD) return "related";
  return "different";
};

// Updated colors to be less "Error/Warning" oriented and more "Heatmap" oriented
export const similarityToColor: Record<ISimilarityLevel, MantineColor> = {
  identical: "teal", // Perfect match
  "very-similar": "cyan", // Strong match
  similar: "blue", // Good match
  related: "indigo", // Faint match (Cooler color)
  different: "gray", // Background noise (Dimmed)
};

// Optional: Helper to get a human-readable label if needed in the UI
export const similarityToLabel: Record<ISimilarityLevel, string> = {
  identical: "Duplicate",
  "very-similar": "High Match",
  similar: "Similar",
  related: "Related",
  different: "Unrelated",
};
