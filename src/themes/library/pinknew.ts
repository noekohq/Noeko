import {
  createTheme,
  DefaultMantineColor,
  Input,
  MantineColorsTuple,
  Paper,
} from "@mantine/core";
import { ICSSApplicator, IOverrideResolver } from "../../declarations/themes";
import { getCurrentScheme } from "../../utils/dom";

const generatedTheme: IOverrideResolver = (t) => {
  // Generated Primary Palette (10-step tonal scale based on oklch(0.844 0.133 22))
  const primaryPalette: MantineColorsTuple = [
    "oklch(0.95 0.096 22)",
    "oklch(0.85 0.114 22)",
    "oklch(0.75 0.126 22)",
    "oklch(0.65 0.132 22)",
    "oklch(0.55 0.132 22)",
    "oklch(0.45 0.126 22)",
    "oklch(0.35 0.114 22)",
    "oklch(0.25 0.096 22)",
    "oklch(0.15 0.072 22)",
    "oklch(0.05 0.042 22)",
  ];

  // Semantic Palette (Light Mode Mapping)
  const semanticPalette: MantineColorsTuple = [
    "oklch(0.557 0.035 150)", // Main text
    "oklch(0.557 0.041 31.2)", // Secondary text
    "oklch(0.811 0.02 34)", // Tertiary text
    "oklch(0.822 0.003 64.4)", // Borders
    "oklch(0.875 0.096 45.4)", // Hovered borders
    "oklch(0.993 0.042 51)", // Interactive BG
    "oklch(0.937 0.027 67)", // Hovered surfaces
    "oklch(0.948 0.047 41)", // Surface color
    "oklch(0.948 0.047 41)", // Deeper variant
    "oklch(0.906 0.041 11)", // Main body background
  ];

  const baseColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> = {
    // You can add other generated color ramps here
    primary: primaryPalette,
  };

  const lightColors = {
    ...baseColors,
    // If this is a light theme, 'semanticPalette' defines the 'dark' key colors.
    // If currently dark, we use primary as a placeholder or inversion would be needed.
    dark: semanticPalette, 
  };

  const darkColors = {
    ...baseColors,
    // If this is a dark theme, 'semanticPalette' defines the 'dark' key colors.
    dark: primaryPalette,
  };

  const scheme = t.scheme === "auto" ? getCurrentScheme() : t.scheme;

  // Applicator for light mode
  const lightApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": lightColors.dark[9],
      "--mantine-color-text": lightColors.dark[0],
      "--mantine-color-default": lightColors.dark[8],
      "--color-code-background": lightColors.dark[9],
      "--color-code-foreground": lightColors.dark[1],
      "--color-highlight": "var(--mantine-color-primary-6)",
      "--color-highlight-text": lightColors.dark[0],
      "--item-filled-color": lightColors.dark[8],
    },
    blocks: {
      html: { "scrollbar-color": `${lightColors.dark[4]} transparent` },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
      },
      blockquote: { "border-left": `2.5px solid ${lightColors.primary?.[6]}` },
      pre: { border: `1px solid ${lightColors.dark[7]}` },
      code: { border: `1px solid ${lightColors.dark[6]}` },
      table: { border: `1px solid ${lightColors.dark[7]}` },
      thead: { "background-color": lightColors.dark[8] },
      tr: { border: `1px solid ${lightColors.dark[7]}` },
      th: { color: lightColors.dark[3] },
    },
  };

  // Applicator for dark mode
  const darkApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": darkColors.dark[9],
      "--mantine-color-text": darkColors.dark[0],
      "--mantine-color-default": darkColors.dark[7],
      "--ai-bg": darkColors.dark[9],
      "--color-code-background": darkColors.dark[9],
      "--color-code-foreground": darkColors.dark[1],
      "--color-highlight": "var(--mantine-color-primary-6)",
      "--color-highlight-text": darkColors.dark[9],
      "--item-filled-color": darkColors.dark[8],
    },
    blocks: {
      html: { "scrollbar-color": `${darkColors.dark[4]} transparent` },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
        padding: "0 0.4rem",
        margin: "0 0.2rem",
      },
      blockquote: { "border-left": `2.5px solid ${darkColors.primary?.[6]}` },
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
      return { colors: lightColors, white: "#FFFFFF", black: "#000000" };
    }
    return { colors: darkColors, white: "#FFFFFF", black: "#000000" };
  };

  const { colors, white, black } = colorsToUse();

  const theme = createTheme({
    fontFamily: t.bodyFont === "sans-serif" ? "Geist" : "Besley",
    fontFamilyMonospace: "Geist Mono",
    headings: {
      fontFamily: "Bricolage Grotesque",
      fontWeight: "550",
    },
    colors: colors as any,
    white,
    black,
    primaryColor: "primary",
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

export default generatedTheme;