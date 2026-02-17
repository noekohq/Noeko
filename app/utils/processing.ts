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
