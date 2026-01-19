/**
 * Partial JSON Parser for streaming IGlimpseResult
 *
 * This parser extracts partial data from incomplete JSON strings,
 * allowing the UI to display content as it streams from the LLM.
 *
 * Design:
 * - Character-by-character state machine
 * - Summary: streamed at word boundaries for natural reading
 * - ContentMap: only includes complete, validated objects
 * - Returns null on malformed JSON (falls back to showing nothing)
 */

import {
  IResultSet,
  IGlimpseEntryPoint,
  IGlimpseConnection,
} from "../../app/services/Spyglass";

export interface PartialGlimpseResult {
  summary?: string; // Summary text extracted so far (word-boundary chunks)
  summaryComplete: boolean; // True when closing quote found
  entryPoint?: IGlimpseEntryPoint; // Entry point, only when complete
  contentMap: IResultSet[]; // Only complete, validated sections
  connections?: IGlimpseConnection[]; // Only complete connections
}

// Parser state enum
enum State {
  INITIAL,
  IN_OBJECT,
  EXPECT_KEY,
  IN_STRING,
  EXPECT_COLON,
  EXPECT_VALUE,
  IN_ARRAY,
  IN_NUMBER,
  IN_LITERAL, // true, false, null
}

interface StackFrame {
  type: "object" | "array";
  key?: string; // Current key in object context
  startIndex?: number; // For tracking contentMap item positions
}

/**
 * Parse a potentially incomplete JSON string and extract partial IGlimpseResult data.
 * Returns null if the JSON is malformed in a way we can't recover from.
 */
export function parsePartialGlimpseResult(
  json: string,
): PartialGlimpseResult | null {
  try {
    const parser = new PartialJsonParser(json);
    return parser.parse();
  } catch (e) {
    console.error("Partial JSON parse error:", e);
    return null;
  }
}

class PartialJsonParser {
  private json: string;
  private pos: number = 0;
  private stack: StackFrame[] = [];

  // Result accumulation
  private summary: string = "";
  private summaryComplete: boolean = false;
  private summaryBuffer: string = ""; // Buffer for word-boundary streaming
  private entryPoint?: IGlimpseEntryPoint;
  private contentMap: IResultSet[] = [];
  private connections: IGlimpseConnection[] = [];

  // Tracking state
  private inSummaryValue: boolean = false;
  private inContentMapArray: boolean = false;
  private inConnectionsArray: boolean = false;
  private inEntryPointObject: boolean = false;
  private contentMapDepth: number = 0; // Depth when we entered contentMap
  private connectionsDepth: number = 0;
  private entryPointDepth: number = 0;
  private currentContentMapItemStart: number = -1;
  private currentConnectionItemStart: number = -1;
  private entryPointStart: number = -1;

  constructor(json: string) {
    this.json = json;
  }

  parse(): PartialGlimpseResult {
    this.skipWhitespace();

    if (this.peek() === "{") {
      this.parseObject();
    }

    // Flush any remaining summary buffer at word boundary
    this.flushSummaryBuffer(true);

    return {
      summary: this.summary || undefined,
      summaryComplete: this.summaryComplete,
      entryPoint: this.entryPoint,
      contentMap: this.contentMap,
      connections: this.connections.length > 0 ? this.connections : undefined,
    };
  }

  private peek(): string | undefined {
    return this.json[this.pos];
  }

  private advance(): string | undefined {
    return this.json[this.pos++];
  }

  private skipWhitespace(): void {
    while (this.pos < this.json.length && /\s/.test(this.json[this.pos])) {
      this.pos++;
    }
  }

  private parseObject(): void {
    if (this.peek() !== "{") return;
    this.advance(); // consume '{'

    const parentKey = this.stack.length > 0 ? this.stack[this.stack.length - 1].key : undefined;
    this.stack.push({ type: "object" });

    this.skipWhitespace();

    while (this.pos < this.json.length && this.peek() !== "}") {
      this.skipWhitespace();

      // Parse key
      if (this.peek() !== '"') {
        // Incomplete key, bail
        break;
      }

      const key = this.parseString();
      if (key === null) {
        // Incomplete string, bail
        break;
      }

      // Update stack with current key
      this.stack[this.stack.length - 1].key = key;

      this.skipWhitespace();

      // Expect colon
      if (this.peek() !== ":") {
        break;
      }
      this.advance(); // consume ':'

      this.skipWhitespace();

      // Check if we're entering summary, entryPoint, contentMap, or connections
      if (key === "summary" && this.stack.length === 1) {
        this.inSummaryValue = true;
      } else if (key === "entryPoint" && this.stack.length === 1) {
        this.inEntryPointObject = true;
        this.entryPointDepth = this.stack.length;
        this.entryPointStart = this.pos;
      } else if (key === "contentMap" && this.stack.length === 1) {
        this.inContentMapArray = true;
        this.contentMapDepth = this.stack.length;
      } else if (key === "connections" && this.stack.length === 1) {
        this.inConnectionsArray = true;
        this.connectionsDepth = this.stack.length;
      }

      // Parse value
      this.parseValue();

      // Reset flags after parsing value
      if (key === "summary") {
        this.inSummaryValue = false;
      }

      this.skipWhitespace();

      // Handle comma or end
      if (this.peek() === ",") {
        this.advance();
        this.skipWhitespace();
      }
    }

    if (this.peek() === "}") {
      this.advance(); // consume '}'
    }

    this.stack.pop();

    // If we just finished a contentMap item, try to extract it
    if (this.inContentMapArray && this.currentContentMapItemStart !== -1) {
      this.tryExtractContentMapItem();
    }

    // Try to extract entryPoint if we just finished it
    if (this.inEntryPointObject && this.entryPointStart !== -1) {
      this.tryExtractEntryPoint();
    }

    // Try to extract connection if we just finished it
    if (this.inConnectionsArray && this.currentConnectionItemStart !== -1) {
      this.tryExtractConnectionItem();
    }
  }

  private parseArray(): void {
    if (this.peek() !== "[") return;
    this.advance(); // consume '['

    this.stack.push({ type: "array" });
    const isContentMapArray =
      this.inContentMapArray && this.stack.length === this.contentMapDepth + 1;
    const isConnectionsArray =
      this.inConnectionsArray && this.stack.length === this.connectionsDepth + 1;

    this.skipWhitespace();

    while (this.pos < this.json.length && this.peek() !== "]") {
      this.skipWhitespace();

      // Track start of contentMap items
      if (isContentMapArray && this.peek() === "{") {
        this.currentContentMapItemStart = this.pos;
      }

      // Track start of connections items
      if (isConnectionsArray && this.peek() === "{") {
        this.currentConnectionItemStart = this.pos;
      }

      this.parseValue();

      // Try to extract completed contentMap item
      if (isContentMapArray && this.currentContentMapItemStart !== -1) {
        this.tryExtractContentMapItem();
      }

      // Try to extract completed connection item
      if (isConnectionsArray && this.currentConnectionItemStart !== -1) {
        this.tryExtractConnectionItem();
      }

      this.skipWhitespace();

      if (this.peek() === ",") {
        this.advance();
        this.skipWhitespace();
      }
    }

    if (this.peek() === "]") {
      this.advance(); // consume ']'
      if (isContentMapArray) {
        this.inContentMapArray = false;
      }
      if (isConnectionsArray) {
        this.inConnectionsArray = false;
      }
    }

    this.stack.pop();
  }

  private parseValue(): void {
    this.skipWhitespace();
    const ch = this.peek();

    if (ch === undefined) return;

    if (ch === '"') {
      const str = this.parseString();
      // If we're in summary value context and got a string, it's handled in parseString
      if (str !== null && !this.inSummaryValue) {
        // Regular string value, nothing special to do
      }
    } else if (ch === "{") {
      this.parseObject();
    } else if (ch === "[") {
      this.parseArray();
    } else if (ch === "-" || (ch >= "0" && ch <= "9")) {
      this.parseNumber();
    } else if (ch === "t" || ch === "f" || ch === "n") {
      this.parseLiteral();
    }
  }

  /**
   * Parse a JSON string, handling escape sequences.
   * Returns null if the string is incomplete (no closing quote).
   */
  private parseString(): string | null {
    if (this.peek() !== '"') return null;
    this.advance(); // consume opening '"'

    let result = "";
    let escaped = false;
    const isSummary = this.inSummaryValue;

    while (this.pos < this.json.length) {
      const ch = this.advance()!;

      if (escaped) {
        // Handle escape sequences
        switch (ch) {
          case '"':
            result += '"';
            break;
          case "\\":
            result += "\\";
            break;
          case "/":
            result += "/";
            break;
          case "b":
            result += "\b";
            break;
          case "f":
            result += "\f";
            break;
          case "n":
            result += "\n";
            break;
          case "r":
            result += "\r";
            break;
          case "t":
            result += "\t";
            break;
          case "u":
            // Unicode escape \uXXXX
            if (this.pos + 4 <= this.json.length) {
              const hex = this.json.substring(this.pos, this.pos + 4);
              if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                result += String.fromCharCode(parseInt(hex, 16));
                this.pos += 4;
              } else {
                // Invalid unicode escape, just add literally
                result += "\\u" + hex;
                this.pos += 4;
              }
            }
            break;
          default:
            result += ch;
        }
        escaped = false;

        if (isSummary) {
          this.summaryBuffer += result.slice(-1);
          this.flushSummaryBuffer(false);
        }
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        // End of string
        if (isSummary) {
          // Flush remaining buffer and mark complete
          this.flushSummaryBuffer(true);
          this.summaryComplete = true;
        }
        return result;
      } else {
        result += ch;
        if (isSummary) {
          this.summaryBuffer += ch;
          this.flushSummaryBuffer(false);
        }
      }
    }

    // String is incomplete (no closing quote)
    if (isSummary) {
      // Flush at word boundary even though incomplete
      this.flushSummaryBuffer(false);
    }
    return null;
  }

  /**
   * Flush summary buffer to result at word boundaries.
   * @param force - If true, flush everything regardless of word boundary
   */
  private flushSummaryBuffer(force: boolean): void {
    if (this.summaryBuffer.length === 0) return;

    if (force) {
      this.summary += this.summaryBuffer;
      this.summaryBuffer = "";
      return;
    }

    // Find the last word boundary (space, punctuation)
    // We want to emit complete words/sentences for natural streaming
    const wordBoundaryRegex = /[\s.,!?;:)\]}>]+/g;
    let lastBoundary = -1;
    let match;

    while ((match = wordBoundaryRegex.exec(this.summaryBuffer)) !== null) {
      lastBoundary = match.index + match[0].length;
    }

    if (lastBoundary > 0) {
      // Emit up to and including the boundary
      this.summary += this.summaryBuffer.substring(0, lastBoundary);
      this.summaryBuffer = this.summaryBuffer.substring(lastBoundary);
    }
  }

  private parseNumber(): void {
    // Just consume the number, we don't need to extract it
    const start = this.pos;

    // Optional negative sign
    if (this.peek() === "-") {
      this.advance();
    }

    // Integer part
    while (this.pos < this.json.length && /[0-9]/.test(this.peek()!)) {
      this.advance();
    }

    // Decimal part
    if (this.peek() === ".") {
      this.advance();
      while (this.pos < this.json.length && /[0-9]/.test(this.peek()!)) {
        this.advance();
      }
    }

    // Exponent part
    if (this.peek() === "e" || this.peek() === "E") {
      this.advance();
      if (this.peek() === "+" || this.peek() === "-") {
        this.advance();
      }
      while (this.pos < this.json.length && /[0-9]/.test(this.peek()!)) {
        this.advance();
      }
    }
  }

  private parseLiteral(): void {
    // Parse true, false, or null
    const literals = ["true", "false", "null"];

    for (const lit of literals) {
      if (this.json.substring(this.pos, this.pos + lit.length) === lit) {
        this.pos += lit.length;
        return;
      }
    }

    // Partial literal, just advance one char
    this.advance();
  }

  /**
   * Try to extract a completed contentMap item from the JSON.
   * Only adds to contentMap if the object is valid JSON.
   */
  private tryExtractContentMapItem(): void {
    if (this.currentContentMapItemStart === -1) return;

    // Find where the current object ends
    // We look backwards from current position to find a complete object
    const substring = this.json.substring(this.currentContentMapItemStart, this.pos);

    // Count braces to find complete objects
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objectEnd = -1;

    for (let i = 0; i < substring.length; i++) {
      const ch = substring[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          objectEnd = i + 1;
          // Don't break - we want the last complete object
        }
      }
    }

    if (objectEnd > 0) {
      const objectStr = substring.substring(0, objectEnd);

      try {
        const parsed = JSON.parse(objectStr) as IResultSet;

        // Validate it has the expected structure
        if (
          typeof parsed.title === "string" &&
          typeof parsed.description === "string" &&
          Array.isArray(parsed.results)
        ) {
          // Check if we already have this item (by title, since we don't have IDs)
          const exists = this.contentMap.some(
            (item) => item.title === parsed.title && item.description === parsed.description
          );

          if (!exists) {
            this.contentMap.push(parsed);
          }
        }

        // Move the start to after this object for the next item
        this.currentContentMapItemStart = this.currentContentMapItemStart + objectEnd;

        // Skip comma and whitespace
        while (
          this.currentContentMapItemStart < this.json.length &&
          /[\s,]/.test(this.json[this.currentContentMapItemStart])
        ) {
          this.currentContentMapItemStart++;
        }

        // Check if there's another object starting
        if (this.json[this.currentContentMapItemStart] !== "{") {
          this.currentContentMapItemStart = -1;
        }
      } catch {
        // Not valid JSON yet, leave currentContentMapItemStart as is
      }
    }
  }

  /**
   * Try to extract the entryPoint object from the JSON.
   * Only sets entryPoint if the object is valid JSON with required fields.
   */
  private tryExtractEntryPoint(): void {
    if (this.entryPointStart === -1) return;

    const substring = this.json.substring(this.entryPointStart, this.pos);

    // Count braces to find complete object
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objectEnd = -1;

    for (let i = 0; i < substring.length; i++) {
      const ch = substring[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          objectEnd = i + 1;
          break;
        }
      }
    }

    if (objectEnd > 0) {
      const objectStr = substring.substring(0, objectEnd);

      try {
        const parsed = JSON.parse(objectStr) as IGlimpseEntryPoint;

        // Validate it has the expected structure
        if (
          typeof parsed.resourceId === "string" &&
          typeof parsed.title === "string" &&
          typeof parsed.reason === "string"
        ) {
          this.entryPoint = parsed;
          this.inEntryPointObject = false;
          this.entryPointStart = -1;
        }
      } catch {
        // Not valid JSON yet
      }
    }
  }

  /**
   * Try to extract a completed connection item from the JSON.
   * Only adds to connections if the object is valid JSON.
   */
  private tryExtractConnectionItem(): void {
    if (this.currentConnectionItemStart === -1) return;

    const substring = this.json.substring(
      this.currentConnectionItemStart,
      this.pos
    );

    // Count braces to find complete objects
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objectEnd = -1;

    for (let i = 0; i < substring.length; i++) {
      const ch = substring[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          objectEnd = i + 1;
        }
      }
    }

    if (objectEnd > 0) {
      const objectStr = substring.substring(0, objectEnd);

      try {
        const parsed = JSON.parse(objectStr) as IGlimpseConnection;

        // Validate it has the expected structure
        if (
          typeof parsed.theme === "string" &&
          Array.isArray(parsed.resourceIds)
        ) {
          // Check if we already have this connection
          const exists = this.connections.some(
            (item) => item.theme === parsed.theme
          );

          if (!exists) {
            this.connections.push(parsed);
          }
        }

        // Move the start to after this object for the next item
        this.currentConnectionItemStart =
          this.currentConnectionItemStart + objectEnd;

        // Skip comma and whitespace
        while (
          this.currentConnectionItemStart < this.json.length &&
          /[\s,]/.test(this.json[this.currentConnectionItemStart])
        ) {
          this.currentConnectionItemStart++;
        }

        // Check if there's another object starting
        if (this.json[this.currentConnectionItemStart] !== "{") {
          this.currentConnectionItemStart = -1;
        }
      } catch {
        // Not valid JSON yet
      }
    }
  }
}
