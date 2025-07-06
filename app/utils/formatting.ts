import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import * as cheerio from "cheerio";

const md = new MarkdownIt();
const turndownService = new TurndownService();

export const htmlToPlainText = (html: string): string => {
  if (!html) {
    return "";
  }
  try {
    // Load the HTML into cheerio
    const $ = cheerio.load(html);

    // Use the .text() method to get the combined text content of all elements
    // This effectively strips out the HTML tags.
    return $.text();
  } catch (error) {
    console.error("Error parsing HTML with cheerio:", error);
    // Decide how to handle errors - return empty string, original HTML, or throw
    return ""; // Returning empty string on error might be safest for embedding
  }
};

/**
 * Converts a Markdown string to an HTML string.
 * @param markdown The Markdown string to convert.
 * @returns The HTML representation of the Markdown.
 */
export const markdownToHtml = (markdown: string): string => {
  return md.render(markdown);
};

/**
 * Converts an HTML string to a Markdown string.
 * @param html The HTML string to convert.
 * @returns The Markdown representation of the HTML.
 */
export const htmlToMarkdown = (html: string): string => {
  return turndownService.turndown(html);
};

export function stripText(sourceText: string): string {
  // Implement using stripMarkdownSimple (provided above) or a library
  if (!sourceText) return "";
  // For demonstration, using a very basic version of stripMarkdownSimple:
  let text = sourceText;
  text = text.replace(/->([^<]+?)<-/g, ""); // <--- Process your custom syntax
  text = text.replace(/^#{1,6}\s+/gm, ""); // Headers
  text = text.replace(/([\*_~]{1,3})([^\*_~\n]+?)\1/gm, "$2"); // Bold, italic, strike
  text = text.replace(/[\*_~]{1,3}/g, ""); // Cleanup remaining markers
  text = text.replace(/`([^`]+?)`/g, "$1"); // Inline code
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1"); // Images
  text = text.replace(/\[([^\]]+?)\]\([^\)]+\)/g, "$1"); // Links
  text = text.replace(/^[\*\-\+]\s+/gm, ""); // Basic list markers
  text = text.replace(/^\d+\.\s+/gm, ""); // Numbered list markers
  text = text.replace(/^>\s?/gm, ""); // Blockquotes
  text = text.replace(/\s+/g, " ").trim(); // Normalize spaces
  return text;
}
