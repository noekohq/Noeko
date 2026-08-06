import { Card, createTheme, Input, MantineColorsTuple, Menu, Paper, Popover } from "@mantine/core";
import { ICSSApplicator, IOverrideResolver } from "@/declarations/themes";
import { getCurrentScheme } from "@core/utils/dom";

export type PaletteMode = {
  neutral: MantineColorsTuple;
  white: string;
  black: string;
  highlight: string;
  highlightText: string;
  codeBackground?: string;
  codeText?: string;
  backgroundImage?: string;
};

export type PaletteThemeConfig = {
  accent: MantineColorsTuple;
  light: PaletteMode;
  dark: PaletteMode;
  secondary?: MantineColorsTuple;
  headingFont?: string;
  headingWeight?: string;
  radius?: "xs" | "sm" | "md" | "lg" | "xl";
  shadowColor?: string;
};

function createApplicator(
  mode: PaletteMode,
  accent: MantineColorsTuple,
  scheme: "light" | "dark"
): ICSSApplicator {
  const accentShade = scheme === "light" ? accent[6] : accent[4];
  const accentText = scheme === "light" ? accent[7] : accent[3];
  const border = mode.neutral[6];
  const subtleBorder = mode.neutral[7];
  const surface = mode.neutral[8];
  const background = mode.neutral[9];
  const codeBackground = mode.codeBackground ?? background;
  const codeText = mode.codeText ?? mode.neutral[1];

  return {
    variables: {
      "--mantine-color-body": background,
      "--mantine-color-text": mode.neutral[0],
      "--mantine-color-dimmed": scheme === "light" ? mode.neutral[2] : mode.neutral[3],
      "--mantine-color-default": surface,
      "--mantine-color-default-hover": mode.neutral[7],
      "--mantine-color-default-border": subtleBorder,
      "--ai-bg": background,
      "--color-code-background": codeBackground,
      "--color-code-foreground": codeText,
      "--color-highlight": mode.highlight,
      "--color-highlight-text": mode.highlightText,
      "--item-filled-color": surface,
      "--theme-accent": accentShade,
      "--theme-accent-text": accentText,
      "--theme-accent-soft": `color-mix(in srgb, ${accentShade} 16%, transparent)`,
    },
    blocks: {
      body: {
        "background-color": background,
        "background-image": mode.backgroundImage ?? "none",
        "background-repeat": "no-repeat",
        "background-size": "cover",
      },
      html: {
        "scrollbar-width": "thin",
        "scrollbar-color": `${border} transparent`,
      },
      "::selection": {
        "background-color": mode.highlight,
        color: mode.highlightText,
      },
      ".highlight": {
        "background-color": "var(--color-highlight)",
        color: "var(--color-highlight-text)",
        padding: "0 0.4rem",
        margin: "0 0.2rem",
      },
      ".mantine-Menu-dropdown, .mantine-HoverCard-dropdown, .mantine-Popover-dropdown, .mantine-Modal-header, .mantine-Modal-body, .mantine-Modal-content":
        {
          "background-color": `${surface} !important`,
          "border-color": `${subtleBorder} !important`,
        },
      ".mantine-Tooltip-tooltip": {
        "background-color": `${mode.neutral[7]} !important`,
        "border-color": `${border} !important`,
        color: `${mode.neutral[0]} !important`,
      },
      blockquote: {
        "border-left": `2.5px solid ${accentShade}`,
      },
      pre: {
        border: `1px solid ${subtleBorder}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      code: {
        border: `1px solid ${subtleBorder}`,
        "background-color": "var(--color-code-background)",
        color: "var(--color-code-foreground)",
      },
      table: { border: `1px solid ${subtleBorder}` },
      thead: { "background-color": surface },
      tr: { border: `1px solid ${subtleBorder}` },
      th: { color: mode.neutral[3] },
      "a:not([class])": { color: accentShade },
    },
  };
}

export function createPaletteTheme(config: PaletteThemeConfig): IOverrideResolver {
  return (spec) => {
    const scheme = spec.scheme === "auto" ? getCurrentScheme() : spec.scheme;
    const mode = scheme === "light" ? config.light : config.dark;
    const shadowColor = config.shadowColor ?? "rgba(0, 0, 0, 0.16)";
    const colors = {
      dark: mode.neutral,
      brand: config.accent,
      blue: config.secondary ?? config.accent,
    };

    const theme = createTheme({
      fontFamily: spec.bodyFont === "sans-serif" ? "Geist" : "Besley",
      fontFamilyMonospace: "Geist Mono",
      headings: {
        fontFamily: config.headingFont ?? "Bricolage Grotesque",
        fontWeight: config.headingWeight ?? "600",
      },
      colors,
      white: mode.white,
      black: mode.black,
      primaryColor: "brand",
      primaryShade: { light: 6, dark: 5 },
      defaultRadius: config.radius ?? "md",
      shadows: {
        xs: `0 1px 2px ${shadowColor}`,
        sm: `0 3px 10px ${shadowColor}`,
        md: `0 8px 24px ${shadowColor}`,
        lg: `0 16px 48px ${shadowColor}`,
        xl: `0 24px 72px ${shadowColor}`,
      },
      components: {
        Paper: Paper.extend({
          styles: {
            root: {
              backgroundColor: mode.neutral[8],
            },
          },
        }),
        Card: Card.extend({
          styles: {
            root: {
              backgroundColor: mode.neutral[8],
              borderColor: mode.neutral[7],
            },
          },
        }),
        Input: Input.extend({
          styles: (_theme, props) => ({
            input:
              props.variant === "unstyled" || props.unstyled
                ? {
                    backgroundColor: "transparent",
                    border: "none",
                    color: mode.neutral[0],
                  }
                : {
                    backgroundColor: mode.neutral[9],
                    border: `1px solid ${mode.neutral[6]}`,
                    color: mode.neutral[0],
                  },
          }),
        }),
        Popover: Popover.extend({
          styles: {
            dropdown: {
              backgroundColor: mode.neutral[8],
              borderColor: mode.neutral[7],
            },
          },
        }),
        Menu: Menu.extend({
          styles: {
            dropdown: {
              backgroundColor: mode.neutral[8],
              border: `1px solid ${mode.neutral[7]}`,
            },
            arrow: {
              backgroundColor: mode.neutral[8],
              border: "none",
            },
          },
        }),
      },
    });

    return {
      override: theme,
      applicator: createApplicator(mode, config.accent, scheme),
    };
  };
}
