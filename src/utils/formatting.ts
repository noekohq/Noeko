import showdown from "showdown";

export const formatDate = (d: Date) => {
  const date = new Date(d);

  return formatDateRelative(date);
};

export const formatDateTime = (d: Date) => {
  const date = new Date(d);

  return `${capitalize(formatDateRelative(date))}, ${formatTimeWithinDay(date)}`;
};

function formatTimeWithinDay(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const isToday = now.toDateString() === date.toDateString();

  if (isToday) {
    if (diffSeconds < 60) {
      return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 6) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
  }

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes.toString();
  return `${hours}:${minutesStr} ${ampm}`;
}

function formatDateRelative(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const diffTime = today.getTime() - inputDateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays} days ago`;
  } else {
    const month = date.toLocaleString("default", { month: "long" });
    const day = date.getDate();
    const year = date.getFullYear();
    if (now.getFullYear() === year) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${year}`;
  }
}

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

export const capitalize = (text: string) => {
  if (!text) {
    return "";
  }

  return text
    .split(" ") // Split the string into an array of words
    .map((word) => {
      if (word.length === 0) {
        return "";
      }
      return word.charAt(0).toUpperCase() + word.slice(1); // Capitalize the first letter and append the rest of the word
    })
    .join(" "); // Join the words back into a string
};
