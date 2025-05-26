import { createTheme, MantineThemeOverride } from "@mantine/core";
import {
  IThemeSpec,
  IThemeOption,
  IThemeResolved,
} from "../declarations/themes";
import { overrides } from "./themes";

export function ResolveTheme(spec: IThemeSpec): IThemeResolved {
  const o = overrides[spec.override](spec);

  return {
    override: o,
    scheme: spec.scheme,
  };
}
