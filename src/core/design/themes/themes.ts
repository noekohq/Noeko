import { IThemeOption, IOverrideResolver } from '@/declarations/themes';
import nord from "./library/nord";
import pinkLady from "./library/pinkLady";
import noeko from "./library/noeko";
import dracula from "./library/dracula";

export const overrides: Record<IThemeOption, IOverrideResolver> = {
  noeko: noeko,
  nord: nord,
  pinkLady: pinkLady,
  dracula: dracula,
};
