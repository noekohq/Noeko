import { ICSSApplicator, IThemeSpec } from '@/declarations/themes';

export function matchParentWidth(fixedElementId: string, parentElementId: string): void {
  const fixedEl = document.getElementById(fixedElementId) as HTMLElement | null;
  const parentEl = document.getElementById(parentElementId) as HTMLElement | null;

  if (fixedEl && parentEl) {
    const parentWidth = parentEl.offsetWidth; // Includes padding and border

    fixedEl.style.width = `${parentWidth}px`;

    const parentRect = parentEl.getBoundingClientRect();
    fixedEl.style.left = `${parentRect.left}px`;
  } else {
    console.warn("Could not find fixed element or parent element.");
  }
}

export const isDarkScheme = () => {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDarkMode;
};

export const getCurrentScheme = (): IThemeSpec["scheme"] => {
  if (isDarkScheme()) {
    return "dark";
  }
  return "light";
};

export function generateTextFragmentUrl(
  textStart: string,
  options?: {
    textEnd?: string;
    prefix?: string;
    suffix?: string;
  }
): string {
  if (!textStart) {
    console.warn("textStart cannot be empty for a text fragment URL.");
    return "";
  }

  // URL-encode all parts of the text fragment to handle spaces, special characters, etc.
  const encodedTextStart = encodeURIComponent(textStart);
  let fragment = `#:~:text=`;

  const parts: string[] = [];

  // Add prefix if provided
  if (options?.prefix) {
    parts.push(encodeURIComponent(options.prefix) + "-");
  }

  // Add textStart
  parts.push(encodedTextStart);

  // Add textEnd if provided
  if (options?.textEnd) {
    parts.push(encodeURIComponent(options.textEnd));
  }

  // Add suffix if provided
  if (options?.suffix) {
    parts.push("-" + encodeURIComponent(options.suffix));
  }

  fragment += parts.join(",");

  return fragment;
}

export function getCssVariableValue(
  variableName: string,
  element: HTMLElement = document.documentElement
): string {
  if (typeof window !== "undefined" && typeof getComputedStyle === "function") {
    // Ensure we are in a browser environment
    const styles = getComputedStyle(element);
    const value = styles.getPropertyValue(variableName.trim()).trim();
    return value;
  }
  // Return empty string or handle as an error if not in a browser environment
  // or if getComputedStyle is not available.
  console.warn(
    "getCssVariableValue can only be used in a browser environment with getComputedStyle support."
  );
  return "";
}

export const extractNumberFromCSSValue = (
  variableName: string,
  element: HTMLElement = document.documentElement
): number => {
  const value = getCssVariableValue(variableName, element);
  // 20px -> 20, 50vw -> 50
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const setCssVariable = (variableName: string, value: string): void => {
  document.documentElement.style.setProperty(variableName, value);
};

export const applyStyleBlocks = (blocks: ICSSApplicator["blocks"]): void => {
  for (const [selector, styleBlock] of Object.entries(blocks)) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        for (const [property, value] of Object.entries(styleBlock)) {
          element.style.setProperty(property, value);
        }
      }
    });
  }
};
