import {
  createTheme,
  DefaultMantineColor,
  Input,
  MantineColorsTuple,
  Menu,
  Paper,
  Popover,
} from "@mantine/core";
import { ICSSApplicator, IOverrideResolver } from '@/declarations/themes';
import { getCurrentScheme } from '@core/utils/dom';

const dracula: IOverrideResolver = (t) => {
  // Dracula standard palette mapped to your system
  // NOTE: Dracula is primarily a Dark theme.
  // For Light mode, we use a high-contrast "Alabaster" style to keep the spirit.

  const darkColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    dark: [
      "#f8f8f2", // 0: Text (Foreground)
      "#e6e6e6", // 1
      "#bfbfbf", // 2
      "#999999", // 3
      "#6272a4", // 4: Comment
      "#44475a", // 5: Selection
      "#282a36", // 6: Background Alt
      "#21222c", // 7: Background Alt 2
      "#44475a", // 8: Surface/Cards (Current Line)
      "#282a36", // 9: Main Background
    ],
    gray: [
      "#f8f8f2",
      "#e6e6e6",
      "#bfbfbf",
      "#999999",
      "#6272a4",
      "#44475a",
      "#282a36",
      "#21222c",
      "#191a21",
      "#000000",
    ],
    red: [
      // Red
      "#ffb3b3",
      "#ff9999",
      "#ff8080",
      "#ff6666",
      "#ff5555",
      "#ff5555",
      "#e64d4d",
      "#cc4444",
      "#b33b3b",
      "#993333",
    ],
    blue: [
      // Cyan (Dracula uses Cyan heavily)
      "#d9fbfb",
      "#b3f7f7",
      "#8be9fd",
      "#8be9fd",
      "#66d9ef",
      "#8be9fd",
      "#7ad3e6",
      "#69bdce",
      "#58a7b6",
      "#47919e",
    ],
    green: [
      // Green
      "#d9fbe3",
      "#b3f7c7",
      "#8df3ab",
      "#67ef8f",
      "#50fa7b",
      "#50fa7b",
      "#48e16f",
      "#40c863",
      "#38af57",
      "#30964b",
    ],
    grape: [
      // Purple
      "#f2d9fb",
      "#e5b3f7",
      "#d88df3",
      "#cc67ef",
      "#bd93f9",
      "#bd93f9",
      "#aa84e0",
      "#9775c7",
      "#8466ad",
      "#715894",
    ],
    orange: [
      // Orange
      "#fbeed9",
      "#f7ddb3",
      "#f3cc8d",
      "#efbb67",
      "#ffb86c",
      "#ffb86c",
      "#e6a661",
      "#cc9356",
      "#b3814b",
      "#996e41",
    ],
    highlight: [
      // Yellow
      "#fbfbd9",
      "#f7f7b3",
      "#f3f38d",
      "#efef67",
      "#f1fa8c",
      "#f1fa8c",
      "#d9e17e",
      "#c1c870",
      "#a9af62",
      "#919654",
    ],
  };

  // "Alabaster" / High Contrast Light Mode
  // Dracula doesn't have an official light mode, so this uses
  // distinct high-contrast pairings (Black text on clean white/gray).
  const lightColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    dark: [
      "#282a36", // 0: Text (Dracula Dark Background becomes Text)
      "#44475a", // 1
      "#6272a4", // 2
      "#999999", // 3
      "#bfbfbf", // 4
      "#d0d0d0", // 5
      "#e0e0e0", // 6
      "#f0f0f0", // 7
      "#f8f8f2", // 8: Surface (Off-white)
      "#ffffff", // 9: Background (Pure White)
    ],
    // Reusing the vibrant accents for light mode, slightly tweaked if needed
    // but Dracula colors usually pop well on white too.
    gray: darkColors.gray,
    red: darkColors.red,
    blue: darkColors.blue,
    green: darkColors.green,
    grape: darkColors.grape,
    orange: darkColors.orange,
    highlight: darkColors.highlight,
  };

  // Applicator object for the light theme
  const lightApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": lightColors.dark[9],
      "--mantine-color-text": lightColors.dark[0],
      "--mantine-color-default": lightColors.dark[8],
      "--color-code-background": "#f0f0f0", // Light gray for code
      "--color-code-foreground": "#282a36", // Dark text
      "--color-highlight": lightColors.highlight?.[5] ?? "#f1fa8c",
      "--color-highlight-text": "#282a36",
      "--item-filled-color": lightColors.dark[8],
    },
    blocks: {
      html: {
        "scrollbar-width": "thin",
        "scrollbar-color": `${lightColors.dark[4]} transparent`,
      },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
        padding: "0 0.4rem",
        margin: "0 0.2rem",
      },
      blockquote: {
        "border-left": `2.5px solid ${lightColors.blue?.[5]}`,
        "background-color": "#f8f8f2",
        color: lightColors.dark[1],
      },
      pre: {
        border: `1px solid ${lightColors.dark[7]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      code: {
        border: `1px solid ${lightColors.dark[7]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      table: { border: `1px solid ${lightColors.dark[7]}` },
      thead: { "background-color": lightColors.dark[8] },
      tr: { border: `1px solid ${lightColors.dark[7]}` },
      th: { color: lightColors.dark[2] },
    },
  };

  // Applicator object for the dark theme
  const darkApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": darkColors.dark[9],
      "--mantine-color-text": darkColors.dark[0],
      "--mantine-color-default": darkColors.dark[8], // Dracula "Selection" color for surfaces
      "--ai-bg": darkColors.dark[9],
      "--color-code-background": "#21222c", // Slightly darker than bg
      "--color-code-foreground": "#f8f8f2",
      "--color-highlight": darkColors.highlight?.[5] ?? "#f1fa8c",
      "--color-highlight-text": "#282a36", // Dark text on Yellow highlight
      "--item-filled-color": darkColors.dark[8],
    },
    blocks: {
      html: {
        "scrollbar-width": "thin",
        "scrollbar-color": `${darkColors.dark[5]} transparent`,
      },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
        padding: "0 0.4rem",
        margin: "0 0.2rem",
      },
      ".mantine-Menu-dropdown, .mantine-HoverCard-dropdown, .mantine-Popover-dropdown, .mantine-Modal-header, .mantine-Modal-body":
        {
          "background-color": darkColors.dark[9],
          border: `1px solid ${darkColors.dark[5]}`,
        },
      blockquote: {
        "border-left": `2.5px solid ${darkColors.grape?.[5]}`, // Purple accent
      },
      pre: {
        border: `1px solid ${darkColors.dark[5]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      code: {
        border: `1px solid ${darkColors.dark[5]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      table: { border: `1px solid ${darkColors.dark[5]}` },
      thead: { "background-color": darkColors.dark[8] },
      tr: { border: `1px solid ${darkColors.dark[5]}` },
      th: { color: darkColors.dark[2] },
    },
  };

  const colorsToUse = () => {
    const s = t.scheme === "auto" ? getCurrentScheme() : t.scheme;
    // Return specific white/black for Dracula context
    if (s === "light") {
      return { colors: lightColors, white: "#ffffff", black: "#282a36" };
    }
    return { colors: darkColors, white: "#f8f8f2", black: "#21222c" };
  };

  const scheme = t.scheme === "auto" ? getCurrentScheme() : t.scheme;

  const theme = createTheme({
    fontFamily: t.bodyFont === "sans-serif" ? "Geist" : "Besley",
    fontFamilyMonospace: "Geist Mono",
    headings: {
      fontFamily: "Bricolage Grotesque",
      fontWeight: "550",
    },
    colors: colorsToUse()?.colors,
    primaryColor: "grape",
    primaryShade: 5,
    white: colorsToUse()?.white,
    black: colorsToUse()?.black,
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
            backgroundColor: colorsToUse().colors.dark?.[9], // Deep background for inputs
            borderColor: colorsToUse().colors.dark?.[5],
          },
        },
      }),
      Popover: Popover.extend({
        styles: {
          dropdown: {
            backgroundColor: colorsToUse().colors.dark?.[8],
            borderColor: colorsToUse().colors.dark?.[5],
          },
        },
      }),
      Menu: Menu.extend({
        styles: {
          dropdown: {
            backgroundColor: colorsToUse().colors.dark?.[8],
            border: `1px solid ${colorsToUse().colors.dark?.[5]}`,
          },
          arrow: {
            backgroundColor: colorsToUse().colors.dark?.[8],
            border: "none",
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

export default dracula;
