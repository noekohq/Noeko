import { IThemeOption, IOverrideResolver } from "../declarations/themes";
import nord from "./library/nord";
import pinkLady from "./library/pinkLady";
import noeko from "./library/noeko";

export const overrides: Record<IThemeOption, IOverrideResolver> = {
  noeko: noeko,
  nord: nord,
  pinkLady: pinkLady,
};
