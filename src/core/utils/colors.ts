const MANTINE_CURSOR_COLORS = [
  "red",
  "pink",
  "grape",
  "blue",
  "violet",
  "indigo",
  "cyan",
  "teal",
  "green",
  "lime",
  "orange",
];

export const assignMantineColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % MANTINE_CURSOR_COLORS.length;
  const colorName = MANTINE_CURSOR_COLORS[index];

  return `var(--mantine-color-${colorName}-8)`;
};
