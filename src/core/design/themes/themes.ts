import { IThemeOption, IOverrideResolver } from "@/declarations/themes";
import nord from "./library/nord";
import pinkLady from "./library/pinkLady";
import noeko from "./library/noeko";
import dracula from "./library/dracula";
import basalt from "./library/basalt";
import vaporwave from "./library/vaporwave";
import river from "./library/river";
import paper from "./library/paper";

export type ThemeOptionDefinition = {
  value: IThemeOption;
  label: string;
  description: string;
  swatches: [string, string, string];
  keywords: string;
};

export const themeOptions: ThemeOptionDefinition[] = [
  {
    value: "noeko",
    label: "Gruvbox",
    description: "Warm, tactile, and comfortably familiar",
    swatches: ["#1d2021", "#504945", "#98971a"],
    keywords: "gruvbox default warm earthy retro",
  },
  {
    value: "basalt",
    label: "Basalt",
    description: "Volcanic stone lit by a molten ember",
    swatches: ["#080706", "#151210", "#ff6b35"],
    keywords: "basalt volcanic black stone lava magma fire ember earth bold dark light",
  },
  {
    value: "nord",
    label: "Nord",
    description: "Quiet arctic blues with gentle contrast",
    swatches: ["#1b2432", "#364257", "#5e91c9"],
    keywords: "nord arctic cool blue minimal",
  },
  {
    value: "pinkLady",
    label: "Pink Lady",
    description: "Confident fuchsia softened with blush",
    swatches: ["#190b14", "#2b1322", "#f43f99"],
    keywords: "pink lady girlypop girlboss fuchsia blush",
  },
  {
    value: "vaporwave",
    label: "Vaporwave",
    description: "Neon magenta and cyan after dark",
    swatches: ["#170f29", "#38264e", "#ec49cb"],
    keywords: "vaporwave neon purple cyan retro vibey",
  },
  {
    value: "river",
    label: "Tranquil River",
    description: "Restorative teal, sage, and soft water blue",
    swatches: ["#102724", "#2a4943", "#3ba795"],
    keywords: "river tranquil nature calm teal sage green",
  },
  {
    value: "dracula",
    label: "Dracula",
    description: "Iconic violet contrast for late-night focus",
    swatches: ["#1e1f29", "#44475a", "#bd93f9"],
    keywords: "dracula developer dark purple code",
  },
  {
    value: "paper",
    label: "Paper & Ink",
    description: "Editorial warmth with bookish typography",
    swatches: ["#191715", "#504a43", "#ca5842"],
    keywords: "paper ink editorial serif book warm",
  },
];

export const overrides: Record<IThemeOption, IOverrideResolver> = {
  noeko: noeko,
  basalt: basalt,
  nord: nord,
  pinkLady: pinkLady,
  vaporwave: vaporwave,
  river: river,
  dracula: dracula,
  paper: paper,
};
