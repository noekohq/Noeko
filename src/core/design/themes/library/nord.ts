import { createTheme, DefaultMantineColor, Input, MantineColorsTuple, Paper } from "@mantine/core";
import { ICSSApplicator, IOverrideResolver } from '@/declarations/themes';
import { getCurrentScheme } from '@core/utils/dom';

const nord: IOverrideResolver = (t) => {
  const baseColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> = {
    red: [
      "#F6E8E9",
      "#E9CACD",
      "#DAADB1",
      "#CB8F95",
      "#BD7279",
      "#B5616A",
      "#BF616A",
      "#98434D",
      "#712D35",
      "#4A1B20",
    ],
    orange: [
      "#F9EBE7",
      "#EDD1CA",
      "#E1B7AC",
      "#D69D8E",
      "#CB8370",
      "#D08770",
      "#D08770",
      "#A86754",
      "#7F4B3C",
      "#553127",
    ],
    yellow: [
      "#FDF6EA",
      "#F8E9CA",
      "#F3DBAA",
      "#EECC89",
      "#EACE69",
      "#EBCB8B",
      "#EBCB8B",
      "#C3A26A",
      "#967B4D",
      "#695533",
    ],
    green: [
      "#F0F4EC",
      "#D9E3D3",
      "#C2D1B9",
      "#ACC0A0",
      "#95AF87",
      "#A3BE8C",
      "#A3BE8C",
      "#81996B",
      "#60734E",
      "#404D34",
    ],
    grape: [
      "#F3EDF1",
      "#E1D4DE",
      "#CFBCCE",
      "#BCA3BD",
      "#A98AAE",
      "#B48EAD",
      "#B48EAD",
      "#8F6E87",
      "#6A5064",
      "#453442",
    ],
    cyan: [
      "#ECF4F7",
      "#D1E3E9",
      "#B7D2DB",
      "#9CC1CD",
      "#80B0BF",
      "#88C0D0",
      "#88C0D0",
      "#669BAA",
      "#4B7581",
      "#325058",
    ],
    blue: [
      "#E4EAF1",
      "#C2D0DE",
      "#A0B6CB",
      "#7E9BBC",
      "#5D81AD",
      "#5E81AC",
      "#5E81AC",
      "#436185",
      "#2F4560",
      "#1C2A3C",
    ],
  };

  const lightColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    ...baseColors,
    dark: [
      "#2E3440",
      "#3b4252",
      "#434c5e",
      "#4c566a", // The gradient starts after this color
      "#74829c", // New
      "#9faabf", // New
      "#c9d1e2", // New
      "#d8dee9", // The gradient ends at this color
      "#e5e9f0",
      "#eceff4",
    ],
  };

  const darkColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    ...baseColors,
    dark: [
      "#eceff4",
      "#e5e9f0",
      "#d8dee9",
      "#c9d1e2",
      "#9faabf",
      "#74829c",
      "#4c566a",
      "#434c5e",
      "#3b4252",
      "#2E3440",
    ],
  };

  const scheme = t.scheme === "auto" ? getCurrentScheme() : t.scheme;

  const lightApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": lightColors.dark[9], // nord6
      "--mantine-color-text": lightColors.dark[0], // nord0
      "--mantine-color-default": lightColors.dark[8], // nord5
      "--color-code-background": lightColors.dark[9],
      "--color-code-foreground": lightColors.dark[1],
      "--color-highlight": lightColors.yellow?.[6] ?? "--mantine-color-highlight-6", // nord13
      "--color-highlight-text": lightColors.dark[1],
      "--item-filled-color": lightColors.dark[8],
    },
    blocks: {
      html: { "scrollbar-color": `${lightColors.dark[4]} transparent` },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
      },
      blockquote: { "border-left": `2.5px solid ${lightColors.blue?.[6]}` }, // nord10
      pre: { border: `1px solid ${lightColors.dark[7]}` },
      code: { border: `1px solid ${lightColors.dark[6]}` },
      table: { border: `1px solid ${lightColors.dark[7]}` },
      thead: { "background-color": lightColors.dark[8] },
      tr: { border: `1px solid ${lightColors.dark[7]}` },
      th: { color: lightColors.dark[3] },
    },
  };

  const darkApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": darkColors.dark[9], // nord0
      "--mantine-color-text": darkColors.dark[0], // nord6
      "--mantine-color-default": darkColors.dark[7], // nord1
      "--ai-bg": darkColors.dark[9],
      "--color-code-background": darkColors.dark[9],
      "--color-code-foreground": darkColors.dark[1],
      "--color-highlight": darkColors.yellow?.[6] ?? "--mantine-color-yellow-6", // nord13
      "--color-highlight-text": darkColors.dark[9], // Dark text on yellow highlight
      "--item-filled-color": darkColors.dark[8], // nord0
    },
    blocks: {
      html: { "scrollbar-color": `${darkColors.dark[4]} transparent` },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
        padding: "0 0.4rem",
        margin: "0 0.2rem",
      },
      blockquote: { "border-left": `2.5px solid ${darkColors.blue?.[6]}` }, // nord10
      pre: { border: `1px solid ${darkColors.dark[6]}` },
      code: { border: `1px solid ${darkColors.dark[6]}` },
      table: { border: `1px solid ${darkColors.dark[6]}` },
      thead: { "background-color": darkColors.dark[7] },
      tr: { border: `1px solid ${darkColors.dark[6]}` },
      th: { color: darkColors.dark[3] },
    },
  };

  const colorsToUse = () => {
    if (scheme === "light") {
      return { colors: lightColors, white: "#FFFFFF", black: "#2E3440" };
    }
    return { colors: darkColors, white: "#ECEFF4", black: "#2E3440" };
  };

  const { colors, white, black } = colorsToUse();

  const theme = createTheme({
    fontFamily: t.bodyFont === "sans-serif" ? "Geist" : "Besley",
    fontFamilyMonospace: "Geist Mono",
    headings: {
      fontFamily: "Bricolage Grotesque",
      fontWeight: "550",
    },
    colors,
    white,
    black,
    primaryColor: "blue",
    primaryShade: 6,
    components: {
      Paper: Paper.extend({
        styles: {
          root: {
            backgroundColor: colorsToUse().colors.dark?.[8],
          },
        },
      }),
      Input: Input.extend({
        styles: {
          input: {
            backgroundColor: colorsToUse().colors.dark?.[9],
            border: `1px solid ${colorsToUse().colors.dark?.[4]}`,
            color: colorsToUse().colors.dark?.[3],
          },
        },
      }),
    },
  });

  return {
    override: theme,
    applicator: scheme === "light" ? lightApplicator : darkApplicator,
  };
};

export default nord;
