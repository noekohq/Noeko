export const readFileContent = (file: File) => {
  const reader = new FileReader();
  reader.readAsText(file);
  return new Promise<string>((r) => {
    reader.onloadend = (e) => {
      const fileContent = e.target?.result;

      if (typeof fileContent === "string") {
        r(fileContent);
      } else {
        r("Error parsing content.");
      }
    };
  });
};

export function formatFileNameToTitle(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  const cleaned = nameWithoutExt.replace(/[_\-.]+/g, " ");

  const titled = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());

  return titled.trim();
}

export const parseDirectoryContents = async (files: File[]) => {
  const contents: { title: string; content: string }[] = [];
  for (const file of files) {
    const title = formatFileNameToTitle(file.name);
    const content = await readFileContent(file);
    contents.push({ title, content });
  }
  return contents;
};

export const downloadTextAsFile = (
  content: string,
  options: {
    type: string;
    extension: string;
    name: string;
  }
) => {
  const blob = new Blob([content], { type: options.type });
  downloadBlobAsFile(blob, `${options.name}.${options.extension}`);
};

export const downloadBlobAsFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
