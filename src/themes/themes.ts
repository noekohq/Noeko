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
  /* Put your mantine theme override here */
  fontFamily: "Lato, sans-serif",
  spacing: {},
});

export const qwest: IOverrideResolver = (t) => {
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
        "#e1dcdf", // 0 (lightest)
        "#c8c0b9", // 1
        "#b0a395", // 2
        "#988773", // 3
        "#887b6a", // 4
        "#807466", // 5
        "#7c6f64", // 6 (Main Gruvbox Gray)
        "#60564e", // 7
        "#453e38", // 8
        "#2a2623", // 9 (darkest)
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
        "#e0ede0", // 0 (lightest)
        "#c5dcc8", // 1
        "#aacad0", // 2 (Note: this seems to have shifted hue slightly due to math, should be closer to green)
        // Recalculating Teal for light mode for better fidelity if HSL conversion was tricky
        // Original HSL for #689d6a is H:0.34 S:0.21 L:0.51
        // Let's ensure this is preserved. The values below are re-checked.
        "#e0ede0", // 0 (lightest)
        "#c5dcc7", // 1
        "#a9cbaf", // 2
        "#8eba98", // 3
        "#72ac80", // 4
        "#6aa274", // 5
        "#689d6a", // 6 (Main Gruvbox Teal/Aqua)
        "#517b53", // 7
        "#3b593d", // 8
        "#253826", // 9 (darkest)
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
      "#e9e5e0", // 0 (lightest)
      "#dcd6cf", // 1
      "#cec6be", // 2
      "#c0b7ad", // 3
      "#b3a89d", // 4
      "#a8998e", // 5
      "#a89984", // 6 (Main Gruvbox Gray)
      "#7c7368", // 7
      "#504c43", // 8
      "#252421", // 9 (darkest)
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
  };

  const colorsToUse = () => {
    const s = t.scheme === "auto" ? getCurrentScheme() : t.scheme;
    console.log("scheme found:", s);
    if (s === "light") {
      return { colors: lightColors, white: "#ebdbb2", black: "#282828" };
    }
    return { colors: darkColors, white: "#fbf1c7", black: "#3c3836" };
  };

  return createTheme({
    fontFamily: t.bodyFont === "sans-serif" ? "Geist" : "IBMPlexSerif",
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
};

export const overrides: Record<IThemeOption, IOverrideResolver> = {
  qwest: qwest,
};
