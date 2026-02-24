import { IProcessedText } from "@/types/ideas";

export const getWordCount = (text: string): number => {
  if (!text || text.trim() === "") {
    return 0;
  }
  const words = text.match(/[\w'-]+|[^\s\w]+/g);
  return words ? words.length : 0;
};

export const getCharCount = (text: string, omitSpaces: boolean = false): number => {
  if (omitSpaces) {
    return text.replace(/\s/g, "").length;
  }
  return text.length;
};

export const getSentenceCount = (text: string): number => {
  if (!text || text.trim() === "") {
    return 0;
  }
  const sentences = text.match(/[^.!?\s][^.!?\n]*[.!?]+(\s|$)|(\n\s*\n)/g);

  return sentences ? sentences.length : 0;
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
export function matchSegments({ text, opener, closer, splitBy }: MatchSegmentsOptions): string[] {
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
  return sentences ? sentences.map((s) => s.trim()).filter((s) => s.length > 0) : [];
};

export const splitByParagraphs = (text: string): string[] => {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};

export const isValidJSON = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
};

export const isValidJSONWith = (
  jsonString: string,
  options: {
    prefix?: string;
    suffix?: string;
  }
) => {
  try {
    let testString = "";
    if (options.prefix) {
      testString = options.prefix + jsonString;
    }
    if (options.suffix) {
      testString += options.suffix;
    }
    JSON.parse(testString);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Parses a string that is an incomplete JSON array of objects,
 * extracting all the complete objects it can find.
 *
 * @param jsonString The potentially incomplete JSON array string.
 * @returns An array of the successfully parsed objects.
 */
export const parseIncompleteJsonArray = <T = any>(jsonString: string): T[] => {
  const cleanString = jsonString.trim();
  if (!cleanString.startsWith("[")) {
    // If the string doesn't even start with an array, it's not what we expect.
    return [];
  }

  const foundObjects: T[] = [];
  let braceDepth = 0;
  let objectStartIndex = -1;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < cleanString.length; i++) {
    const char = cleanString[i];

    if (char === "\\") {
      isEscaped = !isEscaped;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
    }

    isEscaped = false; // Reset after checking the character

    if (inString) {
      continue; // Ignore structural characters if we're inside a string
    }

    if (char === "{") {
      braceDepth++;
      if (braceDepth === 1) {
        objectStartIndex = i;
      }
    } else if (char === "}") {
      if (braceDepth > 0) {
        braceDepth--;
        if (braceDepth === 0 && objectStartIndex !== -1) {
          // We've found a complete object from start index to current index
          const objectString = cleanString.substring(objectStartIndex, i + 1);
          try {
            const parsedObject = JSON.parse(objectString);
            foundObjects.push(parsedObject);
          } catch (e) {
            // This might happen if the substring is malformed for other reasons,
            // though it's unlikely with this logic. We'll just ignore it.
            console.error("Failed to parse an extracted object:", objectString, e);
          }
          objectStartIndex = -1;
        }
      }
    }
  }

  return foundObjects;
};
