import { createTheme, DefaultMantineColor, Input, MantineColorsTuple, Paper } from "@mantine/core";
import { ICSSApplicator, IOverrideResolver } from "@/declarations/themes";
import { getCurrentScheme } from "@core/utils/dom";

const pinkLady: IOverrideResolver = (t) => {
  // Define the core gradients for the Pink Lady theme
  const pinkLadyLightTuple: MantineColorsTuple = [
    "#45151B",
    "#5D2E32",
    "#754749",
    "#8D6060",
    "#A57978",
    "#BE9290",
    "#D6ACAA",
    "#EFC6C4",
    "#FFF0E9",
    "#FFFBF2",
  ];

  const pinkDusk: MantineColorsTuple = [
    "#FDECF4", // Main text - a soft, creamy rose white
    "#E8DDE2", // Secondary text
    "#B9AAB2", // Tertiary text / subtle borders
    "#8E7C84", // Borders
    "#66545B", // Hovered borders / UI elements
    "#4F3F46", // Interactive component backgrounds (e.g. inactive tabs)
    "#3B2E34", // Hovered surfaces (e.g. list items)
    "#2E262A", // Surface color (Paper, cards)
    "#211C1F", // Main body background - a deep, warm rosewood
    "#1A1618", // A slightly deeper variant for contrast if needed
  ];

  const baseColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> = {
    // A red/pink tuple inspired by Mauvelous and Bittersweet Shimmer
    red: [
      "#FBEAEC",
      "#F2CED3",
      "#E9B2B9",
      "#E095A0",
      "#D77987",
      "#D26978",
      "#C74E51",
      "#B04548",
      "#993B3E",
      "#823235",
    ],
    // An orange tuple inspired by Royal Orange and Peach Fuzz
    orange: [
      "#FFF1E8",
      "#FAD8C3",
      "#F5BF9E",
      "#F0A679",
      "#EC8D54",
      "#E87C3E",
      "#F99256",
      "#DE6B2D",
      "#C35A21",
      "#A84A16",
    ],
    // A yellow tuple inspired by Caramel
    yellow: [
      "#FEF9E5",
      "#FBEDB5",
      "#F9E185",
      "#F7D555",
      "#F5C925",
      "#FBDE9C",
      "#F7C361",
      "#DAB050",
      "#BD9D3E",
      "#A08A2D",
    ],
    pinkPearl: [
      "#FBE4F5",
      "#F2C9E5",
      "#E9ADD5",
      "#E091C5",
      "#D775B5",
      "#D264A9",
      "#E283C2",
      "#C6589B",
      "#AF4D89",
      "#984277",
    ],
    vibrantPink: [
      "#FFE9F6",
      "#FFD1E9",
      "#FA9CD5",
      "#F564BF",
      "#F138AB",
      "#E51E98", // A strong primary shade
      "#D90B88", // This could be your primary shade (index 6)
      "#C00075",
      "#A90067",
      "#920059",
    ],
  };

  const lightColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    ...baseColors,
    dark: pinkLadyLightTuple,
  };

  const darkColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> & {
    dark: MantineColorsTuple;
  } = {
    ...baseColors,
    dark: pinkDusk,
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
      "--color-highlight": lightColors.orange?.[6] ?? "--mantine-color-orange-6",
      "--color-highlight-text": lightColors.dark[0],
      "--item-filled-color": lightColors.dark[8],
    },
    blocks: {
      html: { "scrollbar-color": `${lightColors.dark[4]} transparent` },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
      },
      blockquote: { "border-left": `2.5px solid ${lightColors.red?.[6]}` },
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
      "--color-highlight": darkColors.orange?.[6] ?? "--mantine-color-orange-6",
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
      blockquote: { "border-left": `2.5px solid ${darkColors.red?.[6]}` },
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
      return { colors: lightColors, white: "#FFFFFF", black: "#45151B" };
    }
    return { colors: darkColors, white: "#FBDE9C", black: "#45151B" };
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
    primaryColor: t.scheme === "dark" ? "vibrantPink" : "pinkPearl", // Changed to a thematic color
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

export default pinkLady;
