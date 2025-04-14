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
