import {
  createTheme,
  DefaultMantineColor,
  Input,
  MantineColorsTuple,
  Menu,
  Paper,
  Popover,
} from "@mantine/core";
import { ICSSApplicator, IOverrideResolver } from "../../declarations/themes";
import { getCurrentScheme } from "../../utils/dom";

const noeko: IOverrideResolver = (t) => {
  const lightColors: Partial<
    Record<DefaultMantineColor, MantineColorsTuple>
  > & { dark: MantineColorsTuple } = {
    dark: [
      "#282828", // 0
      "#3c3836", // 1
      "#504945", // 2
      "#665c54", // 3
      "#7c6f64", // 4
      "#a89984", // 5
      "#bdae93", // 6
      "#d5c4a1", // 7
      "#ebdbb2", // 8
      "#fbf1c7", // 9
    ],
    gray: [
      "#fdf4ea",
      "#ede7e0",
      "#d4cdc6",
      "#bbb2a8",
      "#a69a8f",
      "#998c7f",
      "#928374",
      "#807163",
      "#736455",
      "#665645",
    ],
    red: [
      "#f8d4d3",
      "#f3b0ae",
      "#ee8d8a",
      "#e96a65",
      "#e44640",
      "#db2b23",
      "#cc241d",
      "#9f1c16",
      "#721410",
      "#450c09",
    ],
    blue: [
      "#d9e7e7",
      "#bcddde",
      "#a0d3d4",
      "#84c8cb",
      "#69bdc1",
      "#54a9ad",
      "#458588",
      "#36686a",
      "#284b4d",
      "#192d2f",
    ],
    green: [
      "#e9e9d2",
      "#dcdcac",
      "#cece85",
      "#c0c05f",
      "#b2b238",
      "#a2a22b",
      "#98971a",
      "#727113",
      "#555510",
      "#33330b",
    ],
    grape: [
      "#eeddea",
      "#e2c0d0",
      "#d7a3b7",
      "#cb869d",
      "#c06a85",
      "#b75d7d",
      "#b16286",
      "#8b4d69",
      "#66384d",
      "#402330",
    ],
    teal: [
      "#edf9ed",
      "#e0ede0",
      "#c2d8c3",
      "#a1c2a3",
      "#86af87",
      "#74a476",
      "#689d6a",
      "#588a5a",
      "#4c7b4f",
      "#3e6b40",
    ],
    orange: [
      "#f9e0cf",
      "#f5c6a9",
      "#f0ac83",
      "#ec925d",
      "#e77736",
      "#de6722",
      "#d65d0e",
      "#a5480b",
      "#753308",
      "#441e05",
    ],
    highlight: [
      "#fdfce4",
      "#f8f6d3",
      "#f0eca9",
      "#e9e384",
      "#e0d856",
      "#dcd23d",
      "#dad02e",
      "#c0b720",
      "#aba316",
      "#938c02",
    ],
    // No redLight in the Mantine default colors, so it's omitted for type safety
  };
  const darkColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    dark: [
      "#fbf1c7", // 0
      "#ebdbb2", // 1
      "#d5c4a1", // 2
      "#bdae93", // 3
      "#a89984", // 4
      "#7c6f64", // 5
      "#665c54", // 6
      "#504945", // 7
      "#282828", // 8
      "#1d2021", // 9
    ],
    gray: [
      "#fdf4ea",
      "#ede7e0",
      "#d4cdc6",
      "#bbb2a8",
      "#a69a8f",
      "#998c7f",
      "#928374",
      "#807163",
      "#736455",
      "#665645",
    ],
    red: [
      "#f8d4d3",
      "#f4b1af",
      "#ef8d8a",
      "#ea6a65",
      "#e54640",
      "#de2923",
      "#cc241d",
      "#991b16",
      "#66120f",
      "#330907",
    ],
    blue: [
      "#d9e7e7",
      "#beddde",
      "#a3d3d4",
      "#88c8cb",
      "#6cbec1",
      "#56a9ad",
      "#458588",
      "#346466",
      "#234344",
      "#112122",
    ],
    green: [
      "#e9e9d2",
      "#dcdcac",
      "#cfcf85",
      "#c1c15e",
      "#b3b338",
      "#a3a22b",
      "#98971a",
      "#727113",
      "#4c4b0d",
      "#262506",
    ],
    grape: [
      "#eeddea",
      "#e3c0d0",
      "#d8a3b7",
      "#cc869d",
      "#c16a85",
      "#b95c7d",
      "#b16286",
      "#854a65",
      "#583243",
      "#2c1922",
    ],
    teal: [
      // Note: This was a copy of grape in your original, using green as a placeholder
      "#e9e9d2",
      "#dcdcac",
      "#cfcf85",
      "#c1c15e",
      "#b3b338",
      "#a3a22b",
      "#98971a",
      "#727113",
      "#4c4b0d",
      "#262506",
    ],
    orange: [
      "#f9e0cf",
      "#f5c6a9",
      "#f1ac83",
      "#ed915c",
      "#e87736",
      "#e06621",
      "#d65d0e",
      "#a0460b",
      "#6b2f07",
      "#351703",
    ],
    highlight: [
      "#fcfbed",
      "#f8f6dc",
      "#f1edb2",
      "#e9e384",
      "#e3db5f",
      "#dfd648",
      "#ddd33c",
      "#c4ba2f",
      "#aea626",
      "#938c02",
    ],
  };

  // Applicator object for the light theme
  const lightApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": lightColors.dark[9],
      "--mantine-color-text": lightColors.dark[0],
      "--mantine-color-default": lightColors.dark[8],
      "--color-code-background": lightColors.dark[9],
      "--color-code-foreground": lightColors.dark[1],
      "--color-highlight":
        lightColors.highlight?.[6] ?? "--mantine-color-highlight-6",
      "--color-highlight-text": lightColors.dark[0],
      "--item-filled-color": lightColors.dark[8],
    },
    blocks: {
      html: {
        "scrollbar-width": "thin",
        "scrollbar-color": `${lightColors.dark[5]} transparent`,
      },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
        padding: "0 0.4rem",
        margin: "0 0.2rem",
      },
      blockquote: {
        "border-left": `2.5px solid ${lightColors.blue?.[5]}`,
      },
      pre: {
        border: `1px solid ${lightColors.gray?.[5]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      code: {
        border: `1px solid ${lightColors.dark[7]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      table: {
        border: `1px solid ${lightColors.dark[7]}`,
      },
      thead: {
        "background-color": lightColors.dark[8],
      },
      tr: {
        border: `1px solid ${lightColors.dark[7]}`,
      },
      th: {
        color: lightColors.dark[5],
      },
    },
  };

  // Applicator object for the dark theme
  const darkApplicator: ICSSApplicator = {
    variables: {
      "--mantine-color-body": darkColors.dark[9],
      "--mantine-color-text": darkColors.dark[0],
      "--mantine-color-default": darkColors.dark[7],
      "--ai-bg": darkColors.dark[9],
      "--color-code-background": darkColors.dark[9],
      "--color-code-foreground": darkColors.dark[1],
      "--color-highlight":
        darkColors.highlight?.[9] ?? "--mantine-color-highlight-9",
      "--color-highlight-text": darkColors.dark[0],
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
        },
      blockquote: {
        "border-left": `2.5px solid ${darkColors.blue?.[5]}`,
      },
      pre: {
        border: `1px solid ${darkColors.gray?.[5]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      code: {
        border: `1px solid ${darkColors.dark[7]}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      table: {
        border: `1px solid ${darkColors.dark[8]}`,
      },
      thead: {
        "background-color": darkColors.dark[8],
      },
      tr: {
        border: `1px solid ${darkColors.dark[7]}`,
      },
      th: {
        color: darkColors.dark[5],
      },
    },
  };

  const colorsToUse = () => {
    const s = t.scheme === "auto" ? getCurrentScheme() : t.scheme;
    if (s === "light") {
      return { colors: lightColors, white: "#ebdbb2", black: "#282828" };
    }
    return { colors: darkColors, white: "#fbf1c7", black: "#3c3836" };
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
    primaryColor: "blue",
    primaryShade: 7,
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
            backgroundColor: colorsToUse().colors.dark?.[9],
          },
        },
      }),
      Popover: Popover.extend({
        styles: {
          dropdown: {
            backgroundColor: colorsToUse().colors.dark?.[8],
          },
        },
      }),
      Menu: Menu.extend({
        styles: {
          dropdown: {
            backgroundColor: colorsToUse().colors.dark?.[8],
            border: "none",
          },
          arrow: {
            backgroundColor: colorsToUse().colors.dark[8],
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

export default noeko;
