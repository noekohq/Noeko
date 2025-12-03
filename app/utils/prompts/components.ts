export function getFormattedDateTimeToday(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true, // Use 12-hour clock (e.g., 4:27:10 PM)
  };

  return now.toLocaleDateString("en-US", options);
}
