import { MantineColor } from "@mantine/core";
import {
  CircleHalfIcon,
  IconProps,
  WifiHighIcon,
  WifiMediumIcon,
  WifiSlash,
  WifiSlashIcon,
} from "@phosphor-icons/react";

export type ISimilarityLevel =
  | "identical" // ~1.0
  | "very-similar" // High similarity
  | "similar" // Moderate similarity
  | "related" // Low similarity
  | "different"; // Very low similarity

// Order from most similar to least similar
const similarityLevels: ISimilarityLevel[] = [
  "identical",
  "very-similar",
  "similar",
  "related",
  "different",
];

// Example thresholds (adjust these based on empirical results!)
const VERY_SIMILAR_THRESHOLD = 0.85;
const SIMILAR_THRESHOLD = 0.65;
const RELATED_THRESHOLD = 0.4;
const IDENTICAL_THRESHOLD = 0.99; // Allow for slight floating point inaccuracies

export const similarityToLevel = (similarity: number): ISimilarityLevel => {
  // Clamp similarity to the valid range [0, 1]
  const clampedSimilarity = Math.max(0, Math.min(1, similarity));

  if (clampedSimilarity >= IDENTICAL_THRESHOLD) return similarityLevels[0]; // identical
  if (clampedSimilarity >= VERY_SIMILAR_THRESHOLD) return similarityLevels[1]; // very-similar
  if (clampedSimilarity >= SIMILAR_THRESHOLD) return similarityLevels[2]; // similar
  if (clampedSimilarity >= RELATED_THRESHOLD) return similarityLevels[3]; // related
  return similarityLevels[4]; // different
};

export const similarityToColor: Record<ISimilarityLevel, MantineColor> = {
  identical: "green",
  "very-similar": "blue",
  similar: "yellow",
  related: "orange",
  different: "red",
};
