import {
  createTheme,
  DefaultMantineColor,
  Input,
  MantineColorsTuple,
  MantineThemeColors,
  MantineThemeOverride,
  Paper,
} from "@mantine/core";
import { IThemeOption, IOverrideResolver } from "../declarations/themes";
import { getCurrentScheme, isDarkScheme } from "../utils/dom";

export const theme = createTheme({
  spacing: {},
});

export const noeko: IOverrideResolver = (t) => {
  const lightColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> =
    {
      dark: [
        "#282828",
        "#3c3836",
        "#504945",
        "#665c54",
        "#7c6f64",
        "#a89984",
        "#bdae93",
        "#d5c4a1",
        "#ebdbb2",
        "#fbf1c7",
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
        "#f8d4d3", // 0 (lightest)
        "#f3b0ae", // 1
        "#ee8d8a", // 2
        "#e96a65", // 3
        "#e44640", // 4
        "#db2b23", // 5
        "#cc241d", // 6 (Main Gruvbox Red)
        "#9f1c16", // 7
        "#721410", // 8
        "#450c09", // 9 (darkest)
      ],
      redLight: [
        "#ffd29c",
        "#ffd3ce",
        "#ffa79c",
        "#fd7667",
        "#fb4934",
        "#fb341c",
        "#FB4934",
        "#e01702",
        "#c80e00",
        "#af0000",
      ],
      blue: [
        "#d9e7e7", // 0 (lightest)
        "#bcddde", // 1
        "#a0d3d4", // 2
        "#84c8cb", // 3
        "#69bdc1", // 4
        "#54a9ad", // 5
        "#458588", // 6 (Main Gruvbox Blue)
        "#36686a", // 7
        "#284b4d", // 8
        "#192d2f", // 9 (darkest)
      ],
      green: [
        "#e9e9d2", // 0 (lightest)
        "#dcdcac", // 1
        "#cece85", // 2
        "#c0c05f", // 3
        "#b2b238", // 4
        "#a2a22b", // 5
        "#98971a", // 6 (Main Gruvbox Green)
        "#777615", // 7
        "#555510", // 8
        "#33330b", // 9 (darkest)
      ],
      grape: [
        "#eeddea", // 0 (lightest)
        "#e2c0d0", // 1
        "#d7a3b7", // 2
        "#cb869d", // 3
        "#c06a85", // 4
        "#b75d7d", // 5
        "#b16286", // 6 (Main Gruvbox Grape)
        "#8b4d69", // 7
        "#66384d", // 8
        "#402330", // 9 (darkest)
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
        "#f9e0cf", // 0 (lightest)
        "#f5c6a9", // 1
        "#f0ac83", // 2
        "#ec925d", // 3
        "#e77736", // 4
        "#de6722", // 5
        "#d65d0e", // 6 (Main Gruvbox Orange)
        "#a5480b", // 7
        "#753308", // 8
        "#441e05", // 9 (darkest)
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
    };
  const darkColors: Partial<Record<DefaultMantineColor, MantineColorsTuple>> = {
    dark: [
      "#fbf1c7",
      "#ebdbb2",
      "#d5c4a1",
      "#bdae93",
      "#a89984",
      "#7c6f64",
      "#665c54",
      "#504945",
      "#32302f",
      "#1d2021",
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
      "#f8d4d3", // 0 (lightest)
      "#f4b1af", // 1
      "#ef8d8a", // 2
      "#ea6a65", // 3
      "#e54640", // 4
      "#de2923", // 5
      "#cc241d", // 6 (Main Gruvbox Red)
      "#991b16", // 7
      "#66120f", // 8
      "#330907", // 9 (darkest)
    ],
    redLight: [
      "#ffebeb",
      "#f9d2d3",
      "#f89fa2",
      "#f86a6e",
      "#f84142",
      "#f92b27",
      "#fa211a",
      "#df1810",
      "#c7100c",
      "#9d0006",
    ],
    blue: [
      "#d9e7e7", // 0 (lightest)
      "#beddde", // 1
      "#a3d3d4", // 2
      "#88c8cb", // 3
      "#6cbec1", // 4
      "#56a9ad", // 5
      "#458588", // 6 (Main Gruvbox Blue)
      "#346466", // 7
      "#234344", // 8
      "#112122", // 9 (darkest)
    ],
    green: [
      "#e9e9d2", // 0 (lightest)
      "#dcdcac", // 1
      "#cfcf85", // 2
      "#c1c15e", // 3
      "#b3b338", // 4
      "#a3a22b", // 5
      "#98971a", // 6 (Main Gruvbox Green)
      "#727113", // 7
      "#4c4b0d", // 8
      "#262506", // 9 (darkest)
    ],
    grape: [
      "#eeddea", // 0 (lightest)
      "#e3c0d0", // 1
      "#d8a3b7", // 2
      "#cc869d", // 3
      "#c16a85", // 4
      "#b95c7d", // 5
      "#b16286", // 6 (Main Gruvbox Grape)
      "#854a65", // 7
      "#583243", // 8
      "#2c1922", // 9 (darkest)
    ],
    teal: [
      "#eeddea", // 0 (lightest)
      "#e3c0d0", // 1
      "#d8a3b7", // 2
      "#cc869d", // 3
      "#c16a85", // 4
      "#b95c7d", // 5
      "#b16286", // 6 (Main Gruvbox Grape)
      "#854a65", // 7
      "#583243", // 8
      "#2c1922", // 9 (darkest)
    ],
    orange: [
      "#f9e0cf", // 0 (lightest)
      "#f5c6a9", // 1
      "#f1ac83", // 2
      "#ed915c", // 3
      "#e87736", // 4
      "#e06621", // 5
      "#d65d0e", // 6 (Main Gruvbox Orange)
      "#a0460b", // 7
      "#6b2f07", // 8
      "#351703", // 9 (darkest)
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
      "#44410b",
    ],
  };

  const colorsToUse = () => {
    const s = t.scheme === "auto" ? getCurrentScheme() : t.scheme;
    if (s === "light") {
      return { colors: lightColors, white: "#ebdbb2", black: "#282828" };
    }
    return { colors: darkColors, white: "#fbf1c7", black: "#3c3836" };
  };

  const theme = createTheme({
    fontFamily: t.bodyFont === "sans-serif" ? "Geist" : "Besley",
    fontFamilyMonospace: "Geist Mono",
    headings: {
      fontFamily: "Bricolage Grotesque",
      fontWeight: "550",
    },
    colors: colorsToUse()?.colors,
    primaryColor: "blue",
    primaryShade: 6,
    white: colorsToUse()?.white,
    black: colorsToUse()?.black,
    components: {
      Paper: Paper.extend({}),
      Input: Input.extend({
        styles: {
          input: {
            backgroundColor: "dark.8",
          },
        },
      }),
    },
  });
  return theme;
};

export const overrides: Record<IThemeOption, IOverrideResolver> = {
  noeko: noeko,
};
