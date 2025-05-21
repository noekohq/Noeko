import { IThemeSpec } from "../declarations/themes";

function matchParentWidth(
  fixedElementId: string,
  parentElementId: string,
): void {
  const fixedEl = document.getElementById(fixedElementId) as HTMLElement | null;
  const parentEl = document.getElementById(
    parentElementId,
  ) as HTMLElement | null;

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
  const prefersDarkMode = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  return prefersDarkMode;
};

export const getCurrentScheme = (): IThemeSpec["scheme"] => {
  if (isDarkScheme()) {
    return "dark";
  }
  return "light";
};
