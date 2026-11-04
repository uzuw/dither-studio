import { PublicError } from "./types";

export const LAYOUTS = [
  "overview",
  "stats",
  "frequency",
  "rhythm",
  "distribution",
  "streaks",
  "repositories",
  "calendar",
  "profile",
] as const;
export type Layout = (typeof LAYOUTS)[number];
export const THEMES = ["paper", "midnight"] as const;
export type Theme = (typeof THEMES)[number];
export const PATTERNS = ["bayer", "dots", "weave"] as const;
export const FONTS = ["sans", "mono", "serif"] as const;
export const METRICS = [
  "contributions",
  "pullRequests",
  "reviews",
  "issues",
  "commits",
  "stars",
  "repositories",
  "activeDays",
  "currentStreak",
  "longestStreak",
] as const;
export type Metric = (typeof METRICS)[number];
export const metricNames: Record<Metric, string> = {
  contributions: "Contributions",
  pullRequests: "PRs opened",
  reviews: "PR reviews",
  issues: "Issues opened",
  commits: "Commit contributions",
  stars: "Stars received",
  repositories: "Public repositories",
  activeDays: "Active days",
  currentStreak: "Current streak",
  longestStreak: "Longest streak in period",
};
export const layoutNames: Record<Layout, string> = {
  overview: "Profile overview",
  stats: "Stats card",
  frequency: "Contribution curve",
  rhythm: "Weekday rhythm",
  distribution: "Activity distribution",
  streaks: "Streak spectrum",
  repositories: "Top repositories",
  calendar: "Classic calendar",
  profile: "Profile header",
};
export const CHART_STYLES = ["area", "line", "bars"] as const;
export const GROUPS = ["day", "week", "month"] as const;
export type Palette = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  grid: string;
};
export type Recipe = {
  version: 1;
  title: string;
  subtitle: string;
  tagline: string;
  font: (typeof FONTS)[number];
  pattern: (typeof PATTERNS)[number];
  radius: number;
  metrics: Metric[];
  chartStyle: (typeof CHART_STYLES)[number];
  groupBy: (typeof GROUPS)[number];
  repoCount: number;
  palette: Palette;
  links: { label: string; url: string }[];
};
export type CardOptions = { layout: Layout; theme: Theme; recipe?: Recipe };

export const palettes: Record<Theme, Palette> = {
  paper: {
    background: "#F5F7FA",
    foreground: "#172033",
    muted: "#58657A",
    accent: "#3454F5",
    grid: "#DFE5F0",
  },
  midnight: {
    background: "#172033",
    foreground: "#F5F7FA",
    muted: "#B3BED2",
    accent: "#A9C2FF",
    grid: "#2C374D",
  },
};

export function defaultRecipe(theme: Theme = "paper"): Recipe {
  return {
    version: 1,
    title: "",
    subtitle: "Code, curiosity, and a little texture.",
    tagline: "Made of small contributions.",
    font: "sans",
    pattern: "bayer",
    radius: 16,
    metrics: [
      "contributions",
      "pullRequests",
      "stars",
      "currentStreak",
      "reviews",
      "issues",
      "activeDays",
      "longestStreak",
    ],
    chartStyle: "area",
    groupBy: "week",
    repoCount: 3,
    palette: { ...palettes[theme] },
    links: [],
  };
}

export function normalizeUsername(input: string): string {
  const name = input.trim().toLowerCase();
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(name)) {
    throw new PublicError(
      "Enter a GitHub username: 1–39 letters, numbers, or single hyphens.",
    );
  }
  return name;
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new PublicError("Expected a JSON object.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new PublicError("Recipe contains an unknown field.");
}
function text(value: unknown, fallback: string, limit: number): string {
  if (value === undefined) return fallback;
  if (
    typeof value !== "string" ||
    [...value].length > limit ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new PublicError(
      `Text must be one line of at most ${limit} characters.`,
    );
  return value;
}
function choice<T extends string>(
  value: unknown,
  choices: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if (!choices.includes(value as T))
    throw new PublicError(`Choose one of: ${choices.join(", ")}.`);
  return value as T;
}

export function parseRecipe(input: unknown, theme: Theme = "paper"): Recipe {
  const obj = record(input),
    defaults = defaultRecipe(theme);
  keys(obj, [
    "version",
    "title",
    "subtitle",
    "tagline",
    "font",
    "pattern",
    "radius",
    "palette",
    "links",
    "metrics",
    "chartStyle",
    "groupBy",
    "repoCount",
  ]);
  if (obj.version !== undefined && obj.version !== 1)
    throw new PublicError("Recipe version must be 1.");
  const palette = { ...defaults.palette };
  if (obj.palette !== undefined) {
    const colors = record(obj.palette);
    keys(colors, Object.keys(palette));
    for (const key of Object.keys(palette) as (keyof Palette)[]) {
      if (colors[key] !== undefined) {
        if (
          typeof colors[key] !== "string" ||
          !/^#[\da-f]{6}$/i.test(colors[key])
        )
          throw new PublicError(
            "Palette colors must be six-digit hex colors, e.g. #3454F5.",
          );
        palette[key] = colors[key].toUpperCase();
      }
    }
  }
  const radius = obj.radius ?? defaults.radius;
  if (
    typeof radius !== "number" ||
    !Number.isInteger(radius) ||
    radius < 0 ||
    radius > 24
  )
    throw new PublicError("Corner radius must be an integer from 0 to 24.");
  const metrics = obj.metrics ?? defaults.metrics;
  if (
    !Array.isArray(metrics) ||
    !metrics.length ||
    metrics.length > 8 ||
    new Set(metrics).size !== metrics.length ||
    metrics.some((metric) => !METRICS.includes(metric))
  )
    throw new PublicError("Choose 1–8 different supported metrics.");
  const repoCount = obj.repoCount ?? defaults.repoCount;
  if (
    typeof repoCount !== "number" ||
    !Number.isInteger(repoCount) ||
    repoCount < 1 ||
    repoCount > 5
  )
    throw new PublicError("Show between 1 and 5 repositories.");
  let links: Recipe["links"] = [];
  if (obj.links !== undefined) {
    if (!Array.isArray(obj.links) || obj.links.length > 4)
      throw new PublicError("Use at most four profile links.");
    links = obj.links.map((item) => {
      const link = record(item);
      keys(link, ["label", "url"]);
      const label = text(link.label, "", 24),
        url = text(link.url, "", 200);
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new PublicError("Profile links need an absolute HTTPS URL.");
      }
      if (
        !label.trim() ||
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password
      )
        throw new PublicError(
          "Use a visible label and an HTTPS link without credentials.",
        );
      if (parsed.href.length > 200)
        throw new PublicError(
          "Profile links must fit within 200 characters after URL encoding.",
        );
      return { label, url: parsed.href };
    });
  }
  return {
    version: 1,
    title: text(obj.title, defaults.title, 64),
    subtitle: text(obj.subtitle, defaults.subtitle, 140),
    tagline: text(obj.tagline, defaults.tagline, 64),
    font: choice(obj.font, FONTS, defaults.font),
    pattern: choice(obj.pattern, PATTERNS, defaults.pattern),
    radius,
    metrics: [...metrics],
    chartStyle: choice(obj.chartStyle, CHART_STYLES, defaults.chartStyle),
    groupBy: choice(obj.groupBy, GROUPS, defaults.groupBy),
    repoCount,
    palette,
    links,
  };
}

export function encodeRecipe(recipe: Recipe): string {
  const json = JSON.stringify(parseRecipe(recipe));
  if (new TextEncoder().encode(json).length > 2400)
    throw new PublicError(
      "Recipe is too large for an embed URL (2,400 bytes maximum).",
    );
  return btoa(
    Array.from(new TextEncoder().encode(json), (byte) =>
      String.fromCharCode(byte),
    ).join(""),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function decodeRecipe(encoded: string): Recipe {
  if (encoded.length > 3200 || !/^[\w-]+$/.test(encoded))
    throw new PublicError("Invalid or oversized recipe.");
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    return parseRecipe(
      JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          Uint8Array.from(binary, (char) => char.charCodeAt(0)),
        ),
      ),
    );
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError("Recipe must contain valid UTF-8 JSON.");
  }
}

export function parseOptions(params: URLSearchParams): CardOptions {
  for (const key of params.keys()) {
    if (
      !["layout", "theme", "recipe"].includes(key) ||
      params.getAll(key).length !== 1
    )
      throw new PublicError("Unsupported or repeated card option.");
  }
  const layout = choice(params.get("layout") ?? undefined, LAYOUTS, "calendar");
  const theme = choice(params.get("theme") ?? undefined, THEMES, "paper");
  const encoded = params.get("recipe");
  return {
    layout,
    theme,
    ...(encoded !== null ? { recipe: decodeRecipe(encoded) } : {}),
  };
}

export function optionParams(options: CardOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (options.layout !== "calendar") params.set("layout", options.layout);
  if (!options.recipe && options.theme !== "paper")
    params.set("theme", options.theme);
  if (options.recipe) params.set("recipe", encodeRecipe(options.recipe));
  return params;
}
export function cardPath(username: string, options: CardOptions): string {
  const params = optionParams(options).toString();
  return `/api/card/${normalizeUsername(username)}${params ? `?${params}` : ""}`;
}
