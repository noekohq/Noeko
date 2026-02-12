import { createTheme, MantineThemeOverride } from "@mantine/core";
import { IThemeSpec, IThemeOption, IThemeResolved, ICSSApplicator } from "../declarations/themes";
import { overrides } from "./themes";
import { applyStyleBlocks, setCssVariable } from "../utils/dom";

export function ResolveTheme(spec: IThemeSpec): IThemeResolved {
  if (!((spec.override as string) in overrides)) {
    const fallback = overrides["noeko"]?.(spec);
    applyCSS(fallback.applicator);
    return {
      override: fallback.override,
      scheme: spec.scheme,
      applicator: fallback.applicator,
    };
  }
  const o = overrides[spec.override](spec);
  const override = o.override;
  const applicator = o.applicator;

  applyCSS(applicator);

  return {
    override: override,
    scheme: spec.scheme,
    applicator: applicator,
  };
}

export function applyCSS(applicator: ICSSApplicator) {
  Object.entries(applicator.variables).forEach(([key, value]) => {
    setCssVariable(key, value);
  });
  applyStyleBlocks(applicator.blocks);
}
