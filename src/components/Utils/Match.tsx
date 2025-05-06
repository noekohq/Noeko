// Replace.tsx
import React, { ReactNode } from "react";

interface MatchProps {
  /** The string that marks the beginning of a segment to be replaced. */
  opener: string;
  /** The string that marks the end of a segment to be replaced. */
  closer: string;
  /** A function that takes the matched text (between opener and closer)
   * and returns the ReactNode to render in its place.
   */
  match: (text: string) => ReactNode;
  /** The string content to process. */
  children: string;
}

const Match: React.FC<MatchProps> = ({ opener, closer, match, children }) => {
  // Initial checks for valid inputs
  if (typeof children !== "string") {
    // If children is not a string (e.g., null, undefined, number, or other React elements),
    // we return it as is. You might want to log a warning or throw an error based on strictness.
    if (children === null || children === undefined) return null;
    console.warn(
      "Replace component expects a string child. Received:",
      typeof children,
      children,
    );
    return <>{children}</>;
  }

  if (!children) {
    // Handle empty string child
    return null;
  }

  if (!opener || !closer) {
    console.warn(
      "Replace component requires non-empty 'opener' and 'closer' props.",
    );
    return <>{children}</>; // Return original children if delimiters are invalid
  }

  const resultElements: ReactNode[] = [];
  let lastIndex = 0;
  let reactKey = 0; // Used to generate unique keys for React elements

  while (lastIndex < children.length) {
    const openIndex = children.indexOf(opener, lastIndex);

    if (openIndex === -1) {
      // No more openers found, add the rest of the string if any
      if (lastIndex < children.length) {
        resultElements.push(
          <React.Fragment key={`text-${reactKey++}`}>
            {children.substring(lastIndex)}
          </React.Fragment>,
        );
      }
      break; // Exit loop
    }

    // Add the text segment before the opener
    if (openIndex > lastIndex) {
      resultElements.push(
        <React.Fragment key={`text-${reactKey++}`}>
          {children.substring(lastIndex, openIndex)}
        </React.Fragment>,
      );
    }

    // Search for the closer starting after the opener
    const closeIndex = children.indexOf(closer, openIndex + opener.length);

    if (closeIndex === -1) {
      // No closer found for the current opener.
      // Treat the opener itself as literal text and continue searching after it.
      resultElements.push(
        <React.Fragment key={`text-${reactKey++}`}>
          {children.substring(openIndex, openIndex + opener.length)}
        </React.Fragment>,
      );
      lastIndex = openIndex + opener.length; // Move past the literal opener
      continue; // Continue to the next iteration of the while loop
    }

    // A match is found (opener and closer pair)
    const content = children.substring(openIndex + opener.length, closeIndex);
    const matchedElement = match(content);

    // Add a key to the element returned by the match function.
    // It can be a React element or a primitive type (string, number).
    if (React.isValidElement(matchedElement)) {
      resultElements.push(
        React.cloneElement(matchedElement, { key: `match-${reactKey++}` }),
      );
    } else {
      // If match() returns a string, number, null, etc., wrap it in a Fragment for keying.
      resultElements.push(
        <React.Fragment key={`match-${reactKey++}`}>
          {matchedElement}
        </React.Fragment>,
      );
    }

    lastIndex = closeIndex + closer.length; // Move past the processed segment
  }

  // If after all processing, resultElements is empty (e.g. original child was empty string and initial checks passed)
  // This check is mostly covered by the initial `if (!children)` but can be a safeguard.
  if (resultElements.length === 0) {
    return null;
  }

  return <>{resultElements}</>;
};

export default Match;
