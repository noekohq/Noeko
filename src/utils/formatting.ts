import showdown from "showdown";

export const formatDate = (d: Date) => {
  // mm/dd/yyyy hh:mm:ss in local timezone
  const date = new Date(d);

  // Get components in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}/${day}/${year}`;
};

export const htmlToPlainText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

export const markdownToHtml = (markdown: string) => {
  const converter = new showdown.Converter();
  return converter.makeHtml(markdown);
};

export const formatFileSize = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
};

export const formatCamelCase = (text: string) => {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // insert space before uppercase
    .replace(/^./, (str) => str.toUpperCase()) // capitalize first character
    .replace(/\b\w/g, (char) => char.toUpperCase()); // capitalize every word
};
