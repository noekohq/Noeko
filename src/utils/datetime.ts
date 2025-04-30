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
