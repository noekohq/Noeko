import { MantineColorScheme, MantineThemeOverride } from "@mantine/core";

export type IThemeOption =
  | "noeko"
  | "silicon"
  | "nord"
  | "pinkLady"
  | "vaporwave"
  | "river"
  | "dracula"
  | "paper";

export type IThemeSpec = {
  scheme: MantineColorScheme;
  override: IThemeOption;
  bodyFont: "sans-serif" | "serif";
  headingFont: "sans-serif" | "serif";
};

export type IThemeResolved = {
  scheme: MantineColorScheme;
  override: MantineThemeOverride;
  applicator: ICSSApplicator;
};

type StyleBlock = Record<string, string>;
export type ICSSApplicator = {
  variables: Record<string, string>;
  blocks: Record<string, StyleBlock>;
};

export type IOverrideResolver = (theme: IThemeSpec) => {
  override: PartialDeepObject<MantineThemeOverride>;
  applicator: ICSSApplicator;
};
