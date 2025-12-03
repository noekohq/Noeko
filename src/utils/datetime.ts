enum ITimeOfDay {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
}

export const getTimeOfDay = (hour: number): ITimeOfDay => {
  if (hour >= 6 && hour < 12) return ITimeOfDay.MORNING;
  if (hour >= 12 && hour < 18) return ITimeOfDay.AFTERNOON;
  return ITimeOfDay.EVENING;
};

export const getCurrentTimeOfDay = (): ITimeOfDay => {
  const now = new Date();
  const hour = now.getHours();
  return getTimeOfDay(hour);
};

export const getRelativeDateISO = (unit: "week" | "year" | "month"): string => {
  const d = new Date();
  if (unit === "week") {
    d.setDate(d.getDate() - 7);
  } else if (unit === "month") {
    d.setMonth(d.getMonth() - 1);
  } else if (unit === "year") {
    d.setFullYear(d.getFullYear() - 1);
  }
  d.setHours(0, 0, 0, 0); // Zero out the time
  return d.toISOString();
};

export const getCurrentTime = (): Date => {
  return new Date();
};

export const getCurrentTimeFormatted = (): string => {
  const now = new Date();
  const hour = now.getHours();
  const hourOf = hour % 12 || 12;
  const minute = now.getMinutes();
  const minuteFormatted = minute < 10 ? `0${minute}` : `${minute}`;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hourOf}:${minuteFormatted} ${meridiem}`;
};

export const toYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const day = date.getDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
};

export const fromYYYYMMDD = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};
