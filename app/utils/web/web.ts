import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Fetches and extracts text from a static HTML page.
 * @param url The URL of the page to process.
 * @returns The cleaned text content of the page's body, or null on error.
 */
export async function getTextFromStaticPage(
  url: string,
): Promise<string | null> {
  try {
    const response = await axios.get(url, { timeout: 15000 });
    const html = response.data;

    const $ = cheerio.load(html);

    $("script, style, noscript").remove();

    const bodyText = $("body").text();

    return bodyText.replace(/\s\s+/g, " ").trim();
  } catch (error) {
    console.error(`Error fetching static page ${url}:`, error);
    return null;
  }
}
