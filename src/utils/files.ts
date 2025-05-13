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
