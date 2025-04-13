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
