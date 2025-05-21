import { createTheme, MantineThemeOverride } from "@mantine/core";
import {
  IThemeSpec,
  IThemeOption,
  IThemeResolved,
} from "../declarations/themes";
import { overrides } from "./themes";

export function ResolveTheme(spec: IThemeSpec): IThemeResolved {
  console.log("Resolving theme from spec: ", spec);
  const o = overrides[spec.override](spec);

  return {
    override: o,
    scheme: spec.scheme,
  };
}
