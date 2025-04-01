export const formatDate = (d: Date) => {
  // mm/dd/yyyy hh:mm:ss in local timezone
  const date = new Date(d);

  // Get components in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}/${day}/${year}`;
};
