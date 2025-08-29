import { createTheme, MantineThemeOverride } from "@mantine/core";
import {
  IThemeSpec,
  IThemeOption,
  IThemeResolved,
} from "../declarations/themes";
import { overrides } from "./themes";

export function ResolveTheme(spec: IThemeSpec): IThemeResolved {
  if (!((spec.override as string) in overrides)) {
    return {
      override: overrides["noeko"]?.(spec),
      scheme: spec.scheme,
    };
  }
  const o = overrides[spec.override](spec);

  return {
    override: o,
    scheme: spec.scheme,
  };
}
