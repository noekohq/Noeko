export function parseSource(source: string) {}

export function isYouTubeLink(url: string): boolean {
  const regex =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/;
  return regex.test(url);
}
