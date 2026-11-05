import { palettes, type Recipe, type Theme } from "./recipe";

type Preset = {
  id: string;
  name: string;
  theme: Theme;
  design: Pick<Recipe, "palette" | "pattern" | "font" | "radius">;
};

export const presets: Preset[] = [
  {
    id: "paper",
    name: "Paper",
    theme: "paper",
    design: {
      palette: palettes.paper,
      pattern: "bayer",
      font: "sans",
      radius: 16,
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    theme: "midnight",
    design: {
      palette: palettes.midnight,
      pattern: "bayer",
      font: "sans",
      radius: 16,
    },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    theme: "paper",
    design: {
      palette: {
        background: "#EDF3FF",
        foreground: "#153066",
        muted: "#425B85",
        accent: "#2855D9",
        grid: "#D4E0F5",
      },
      pattern: "bayer",
      font: "mono",
      radius: 4,
    },
  },
  {
    id: "rose",
    name: "Rose",
    theme: "paper",
    design: {
      palette: {
        background: "#FFF1F4",
        foreground: "#4A2033",
        muted: "#805064",
        accent: "#AB315F",
        grid: "#F0D6E0",
      },
      pattern: "dots",
      font: "serif",
      radius: 20,
    },
  },
  {
    id: "moss",
    name: "Moss",
    theme: "paper",
    design: {
      palette: {
        background: "#EEF5EF",
        foreground: "#203D30",
        muted: "#4D695A",
        accent: "#287149",
        grid: "#D3E3D7",
      },
      pattern: "weave",
      font: "mono",
      radius: 8,
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    theme: "midnight",
    design: {
      palette: {
        background: "#25282E",
        foreground: "#F5F5F5",
        muted: "#BABEC7",
        accent: "#E0E3E8",
        grid: "#41454E",
      },
      pattern: "weave",
      font: "sans",
      radius: 0,
    },
  },
];

export function matchingPreset(recipe: Recipe) {
  return presets.find(
    ({ design }) =>
      design.font === recipe.font &&
      design.pattern === recipe.pattern &&
      design.radius === recipe.radius &&
      (Object.keys(design.palette) as (keyof Recipe["palette"])[]).every(
        (key) => design.palette[key] === recipe.palette[key],
      ),
  );
}
