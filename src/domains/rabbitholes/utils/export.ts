import { htmlToMarkdown } from "../../../../app/utils/formatting";
import { getNodeDescription, getNodeTitle } from "@infrastructure/graph/utils";
import { downloadBlobAsFile, downloadTextAsFile } from "@infrastructure/api/files";
import type { IRabbithole, IRabbitholeIncludes } from "../../../../shared/types/rabbithole";

const markdownEscape = (value: string) => value.replace(/([\\`*_{}[\]<>#+.!|])/g, "\\$1");

const safeMarkdown = (value?: string | null) => {
  if (!value?.trim()) return "";
  return htmlToMarkdown(value).trim();
};

const itemType = (item: IRabbitholeIncludes) => item.id.toString().split(":")[0];

const itemTitle = (item: IRabbitholeIncludes) =>
  getNodeTitle(item) || `${itemType(item)[0].toUpperCase()}${itemType(item).slice(1)}`;

const itemBody = (item: IRabbitholeIncludes) => {
  switch (item.type) {
    case "idea":
      return safeMarkdown(item.content);
    case "task": {
      const scratchpad = safeMarkdown(item.scratchpad);
      const details = [
        item.completedAt
          ? `- **Completed:** ${new Date(item.completedAt).toLocaleDateString()}`
          : "",
        item.dueDate ? `- **Due:** ${new Date(item.dueDate).toLocaleDateString()}` : "",
      ].filter(Boolean);
      return [scratchpad, details.length ? `## Details\n\n${details.join("\n")}` : ""]
        .filter(Boolean)
        .join("\n\n");
    }
    case "source":
      return safeMarkdown(item.content);
    case "excerpt": {
      const quote = item.sourceText
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      return [quote, safeMarkdown(item.note)].filter(Boolean).join("\n\n");
    }
    case "tag":
      return item.description?.trim() || "";
  }
};

export const rabbitholeItemToMarkdown = (item: IRabbitholeIncludes) => {
  const title = itemTitle(item);
  const description = getNodeDescription(item)?.trim();
  const body = itemBody(item);
  const fallback = description && description !== body ? description : "";
  return (
    [`# ${markdownEscape(title)}`, body || fallback].filter(Boolean).join("\n\n").trim() + "\n"
  );
};

const markdownFileName = (value: string, fallback = "item") => {
  const safe = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return safe || fallback;
};

const uniqueFileName = (base: string, used: Set<string>) => {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}-${suffix++}`;
  used.add(candidate);
  return candidate;
};

export const rabbitholeToMarkdown = (rabbithole: IRabbithole) => {
  const items = rabbithole.includes ?? [];
  const introduction = [
    `# ${markdownEscape(rabbithole.name)}`,
    rabbithole.description?.trim(),
    rabbithole.contentSummary?.trim()
      ? `> ${rabbithole.contentSummary.trim().replace(/\n/g, "\n> ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!items.length) return `${introduction}\n`;

  const contents = items
    .map((item) => `- ${markdownEscape(itemTitle(item))} _(${itemType(item)})_`)
    .join("\n");
  const sections = items
    .map((item) => rabbitholeItemToMarkdown(item).replace(/^# /, "## ").trim())
    .join("\n\n---\n\n");

  return `${introduction}\n\n## Contents\n\n${contents}\n\n${sections}\n`;
};

export const downloadRabbitholeMarkdown = (rabbithole: IRabbithole) => {
  downloadTextAsFile(rabbitholeToMarkdown(rabbithole), {
    type: "text/markdown",
    extension: "md",
    name: markdownFileName(rabbithole.name, "rabbithole"),
  });
};

export const downloadRabbitholeMarkdownArchive = async (rabbithole: IRabbithole) => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const root = zip.folder(markdownFileName(rabbithole.name, "rabbithole"));
  if (!root) throw new Error("Could not prepare Rabbithole export");

  const items = rabbithole.includes ?? [];
  const usedNames = new Set<string>();
  const indexLines: string[] = [];

  items.forEach((item) => {
    const folder = `${itemType(item)}s`;
    const file = uniqueFileName(markdownFileName(itemTitle(item)), usedNames);
    const path = `${folder}/${file}.md`;
    root.file(path, rabbitholeItemToMarkdown(item));
    indexLines.push(`- [${markdownEscape(itemTitle(item))}](./${path}) _(${itemType(item)})_`);
  });

  root.file(
    "README.md",
    [
      `# ${markdownEscape(rabbithole.name)}`,
      rabbithole.description?.trim(),
      rabbithole.contentSummary?.trim(),
      items.length ? `## Contents\n\n${indexLines.join("\n")}` : "_This Rabbithole is empty._",
    ]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
  downloadBlobAsFile(blob, `${markdownFileName(rabbithole.name, "rabbithole")}.zip`);
};
