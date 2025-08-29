import { MantineColorScheme, MantineThemeOverride } from "@mantine/core";

export type IThemeOption = "noeko";

export type IThemeSpec = {
  scheme: MantineColorScheme;
  override: IThemeOption;
  bodyFont: "sans-serif" | "serif";
  headingFont: "sans-serif" | "serif";
};

export type IThemeResolved = {
  scheme: MantineColorScheme;
  override: MantineThemeOverride;
};

export type IOverrideResolver = (
  theme: IThemeSpec,
) => PartialDeepObject<MantineThemeOverride>;
