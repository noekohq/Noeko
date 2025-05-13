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
