import { IProcessedText } from "../types/ideas";

export const getWordCount = (text: string) => {
  return text.split(" ").length;
};

export const getCharCount = (text: string, omitSpaces?: boolean) => {
  if (omitSpaces) {
    return text.split("").filter((l) => " ").length;
  }
  return text.split("").length;
};

export const getSentenceCount = (text: string) => {
  return text.split(".").length;
};

export const getTextProcessed = (text: string): IProcessedText => {
  return {
    wordCount: getWordCount(text),
    characterCount: getCharCount(text),
    characterCountWithoutSpaces: getCharCount(text, true),
    sentenceCount: getSentenceCount(text),
  } satisfies IProcessedText;
};

interface MatchSegmentsOptions {
  text: string;
  opener: string;
  closer: string;
  splitBy: (text: string) => string[];
}

/**
 * Given a text, opener/closer delimiters, and a splitting function,
 * this function returns all segments (from splitBy) that contain
 * at least one complete 'opener...closer' match.
 *
 * @param options - The options for matching segments.
 * @returns An array of string segments that contain the specified match.
 */
export function matchSegments({
  text,
  opener,
  closer,
  splitBy,
}: MatchSegmentsOptions): string[] {
  // 1. Validate inputs
  if (!text) {
    return [];
  }
  if (!opener || !closer) {
    // console.warn("matchSegments: 'opener' and 'closer' must be non-empty strings.");
    return []; // Crucial delimiters are missing or empty
  }
  if (typeof splitBy !== "function") {
    // console.warn("matchSegments: 'splitBy' must be a function.");
    return []; // Cannot segment the text
  }

  // 2. Split the text into segments using the provided function
  const segments = splitBy(text);
  if (!segments || segments.length === 0) {
    return [];
  }

  // 3. Filter segments to find those containing at least one valid opener...closer sequence
  const matchingSegments = segments.filter((segment) => {
    if (typeof segment !== "string" || !segment) {
      return false; // Ignore non-string or empty segments if splitBy produces them
    }

    let searchFromIndex = 0;
    while (searchFromIndex < segment.length) {
      // Find the next occurrence of the opener
      const openerIndex = segment.indexOf(opener, searchFromIndex);

      if (openerIndex === -1) {
        return false; // No more openers found in this segment
      }

      // Find the closer that appears *after* the current opener
      const closerIndex = segment.indexOf(closer, openerIndex + opener.length);

      if (closerIndex !== -1) {
        return true; // A valid opener...closer pair is found in this segment
      }

      // If no closer was found for the current opener,
      // advance the search position past the current opener to look for the next one.
      // This ensures we don't get stuck on an unclosed opener.
      searchFromIndex = openerIndex + opener.length;
      // If opener.length is 0, this could be an issue, but we've guarded against empty opener.
    }

    return false; // No valid opener...closer pair found after checking all possibilities
  });

  return matchingSegments;
}

export const splitBySentences = (text: string): string[] => {
  if (!text) return [];
  // This regex tries to split by ., !, ? followed by a space or at the end of the string.
  // It keeps the delimiters with the sentences.
  const sentences = text.match(/[^.!?]+[.!?\s]*|[^.!?]+$/g);
  return sentences
    ? sentences.map((s) => s.trim()).filter((s) => s.length > 0)
    : [];
};

export const splitByParagraphs = (text: string): string[] => {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};
