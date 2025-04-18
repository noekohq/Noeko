import Showdown from "showdown";
import * as cheerio from "cheerio";

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

export const markdownToHtml = (markdown: string) => {
  const converter = new Showdown.Converter();
  return converter.makeHtml(markdown);
};
