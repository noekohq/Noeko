/**
 * Smooth scroll to element with offset for TopBar
 */
export const scrollToElement = (
  elementId: string,
  options?: {
    offset?: number;
    behavior?: ScrollBehavior;
  },
) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const offset = options?.offset ?? 80; // Account for TopBar
  const behavior = options?.behavior ?? "smooth";

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior,
  });
};

/**
 * Scroll to element and trigger highlight animation
 */
export const scrollAndHighlight = (elementId: string) => {
  scrollToElement(elementId);

  // Add highlight class, remove after animation
  const element = document.getElementById(elementId);
  if (!element) return;

  element.classList.add("highlight-pulse");
  setTimeout(() => {
    element.classList.remove("highlight-pulse");
  }, 2000);
};
