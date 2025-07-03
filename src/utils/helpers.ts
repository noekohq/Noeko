import React from "react";

export const triggerDownload = (
  downloadLink: string,
  fileName: string,
  newWindow = false,
) => {
  const link = document.createElement("a");
  link.href = downloadLink;
  if (newWindow) {
    link.target = "_blank";
  }
  link.download = fileName || "download";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const sleep = async (ms: number): Promise<void> => {
  return new Promise((r) => {
    setTimeout(() => {
      r(undefined);
    }, ms);
  });
};

export function hasVisibleChildren(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child)) {
      // If it's a Fragment, recursively check its children
      if (child.type === React.Fragment) {
        return hasVisibleChildren(child.props.children);
      }
      // Any other element is considered visible content
      return true;
    }
    // If it's a string, check if it has non-whitespace characters
    if (typeof child === "string") {
      return child.trim().length > 0;
    }
    // Other types (null, undefined, etc.) are not visible
    return false;
  });
}
