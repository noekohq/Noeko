import { stripText } from "../../app/utils/formatting";

export interface ITextRange {
  textStart: string | null;
  textEnd: string | null;
}

export function generateTextFragmentParam(textToHighlight: string) {
  if (!textToHighlight || typeof textToHighlight !== "string") {
    console.warn("Text to highlight must be a non-empty string.");
    return "";
  }
  const encodedText = encodeURIComponent(textToHighlight);
  return `#:~:text=${encodedText}`; // Returns full fragment with #
}

export function generateTextFragment(textToHighlight: string) {
  if (!textToHighlight || typeof textToHighlight !== "string") {
    console.warn("Text to highlight must be a non-empty string.");
    return "";
  }
  const encodedText = encodeURIComponent(textToHighlight);
  return encodedText; // Just URL encodes
}

function extractTextRangeFromPlainText(
  plainText: string | null | undefined,
): ITextRange {
  if (!plainText || typeof plainText !== "string") {
    return { textStart: null, textEnd: null };
  }

  // plainText is assumed to have lines separated by single '\n' from stripMarkdown
  const lines = plainText
    .split("\n")
    .map((line) => line.trim()) // Trim each line individually
    .filter((line) => line !== ""); // Filter out lines that were entirely whitespace

  if (lines.length === 0) {
    return { textStart: null, textEnd: null };
  }

  const textStart = lines[0];
  // textEnd is the last line only if there are multiple distinct lines
  // AND the last line is different from the first line.
  const textEnd =
    lines.length > 1 && lines[lines.length - 1] !== textStart
      ? lines[lines.length - 1]
      : null;

  return { textStart, textEnd };
}

export function generateTextFragmentHashFromText(excerpt: string): string {
  if (!excerpt) {
    return "";
  }
  const plainTextExcerpt = stripText(excerpt);
  const { textStart, textEnd } =
    extractTextRangeFromPlainText(plainTextExcerpt);

  if (!textStart) {
    return "";
  }

  let fragmentCore = encodeURIComponent(textStart);
  if (textEnd) {
    // textEnd is already confirmed to be different from textStart if not null
    fragmentCore += `,${encodeURIComponent(textEnd)}`;
  }
  return `:~:text=${fragmentCore}`;
}
