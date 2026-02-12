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

export const formatDate = (d: Date) => {
  const date = new Date(d);

  return formatDateRelative(date);
};

export const formatDateTime = (d: Date) => {
  const date = new Date(d);

  return `${capitalize(formatDateRelative(date))}, ${formatTimeWithinDay(date)}`;
};

function formatTimeWithinDay(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const isToday = now.toDateString() === date.toDateString();

  if (isToday) {
    if (diffSeconds < 60) {
      return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 6) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
  }

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes.toString();
  return `${hours}:${minutesStr} ${ampm}`;
}

function formatDateRelative(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - inputDateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays} days ago`;
  } else {
    const month = date.toLocaleString("default", { month: "long" });
    const day = date.getDate();
    const year = date.getFullYear();
    if (now.getFullYear() === year) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${year}`;
  }
}

export const capitalize = (text: string) => {
  if (!text) {
    return "";
  }

  return text
    .split(" ") // Split the string into an array of words
    .map((word) => {
      if (word.length === 0) {
        return "";
      }
      return word.charAt(0).toUpperCase() + word.slice(1); // Capitalize the first letter and append the rest of the word
    })
    .join(" "); // Join the words back into a string
};
