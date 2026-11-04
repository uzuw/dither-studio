import {
  defaultRecipe,
  normalizeUsername,
  optionParams,
  parseOptions,
  type CardOptions,
  type Layout,
  type Metric,
  type Recipe,
  type Theme,
} from "./recipe";
import { PublicError } from "./types";

export const CARD_TYPES = [
  "stats",
  "pull-requests",
  "stars",
  "streaks",
  "frequency",
  "rhythm",
  "distribution",
  "streak-spectrum",
  "repositories",
  "calendar",
  "profile",
] as const;
export type CardType = (typeof CARD_TYPES)[number];
export const cards: Record<
  CardType,
  { title: string; description: string; layout: Layout; metrics?: Metric[] }
> = {
  stats: {
    title: "Contribution stats",
    description:
      "Contributions, commit contributions, and active days in your displayed period.",
    layout: "stats",
    metrics: ["contributions", "commits", "activeDays"],
  },
  "pull-requests": {
    title: "Pull requests",
    description:
      "The PRs you opened and the reviews you left in the displayed period.",
    layout: "stats",
    metrics: ["pullRequests", "reviews"],
  },
  stars: {
    title: "Stars received",
    description:
      "Current stars across your public owned repositories, including forks.",
    layout: "stats",
    metrics: ["stars", "repositories"],
  },
  streaks: {
    title: "Contribution streaks",
    description:
      "Current streak, longest streak in period, and active days. UTC dates.",
    layout: "stats",
    metrics: ["currentStreak", "longestStreak", "activeDays"],
  },
  frequency: {
    title: "Contribution curve",
    description: "The shape of your activity, grouped by day, week, or month.",
    layout: "frequency",
  },
  rhythm: {
    title: "Weekday rhythm",
    description: "Average contributions by weekday, based on observed days.",
    layout: "rhythm",
  },
  distribution: {
    title: "Activity distribution",
    description:
      "How often you have quiet days, small sessions, or big bursts.",
    layout: "distribution",
  },
  "streak-spectrum": {
    title: "Streak spectrum",
    description:
      "How often active runs of different lengths occur within the period.",
    layout: "streaks",
  },
  repositories: {
    title: "Top repositories",
    description:
      "Your public owned repositories, ranked by their current stars.",
    layout: "repositories",
  },
  calendar: {
    title: "Classic calendar",
    description:
      "The familiar contribution calendar, printed in your chosen dither texture.",
    layout: "calendar",
  },
  profile: {
    title: "Profile header",
    description:
      "Your introduction, a dithered landscape, and a palette of your own.",
    layout: "profile",
  },
};

export function parseCardType(value: string): CardType {
  if (!CARD_TYPES.includes(value as CardType))
    throw new PublicError("That card type does not exist.", 404);
  return value as CardType;
}

export function cardRecipe(
  type: CardType,
  theme: Theme = "paper",
  design?: Recipe,
) {
  const recipe = { ...(design ?? defaultRecipe(theme)) };
  const allowed = cards[type].metrics;
  if (allowed) {
    const selected = design?.metrics.filter((metric) =>
      allowed.includes(metric),
    );
    recipe.metrics = selected?.length ? selected : [...allowed];
  }
  return recipe;
}

export function parseCardOptions(
  type: CardType,
  params: URLSearchParams,
): CardOptions {
  if (params.has("layout"))
    throw new PublicError("This card's layout is selected by its route.");
  const options = parseOptions(
    new URLSearchParams([...params, ["layout", cards[type].layout]]),
  );
  const allowed = cards[type].metrics;
  if (
    allowed &&
    options.recipe?.metrics.some((metric) => !allowed.includes(metric))
  )
    throw new PublicError("Choose only metrics belonging to this card type.");
  return options;
}

export function resolvedCardOptions(
  type: CardType,
  options: CardOptions,
): CardOptions {
  return {
    ...options,
    layout: cards[type].layout,
    recipe: options.recipe ?? cardRecipe(type, options.theme),
  };
}

export function cardParams(options: CardOptions) {
  const params = optionParams(options);
  params.delete("layout");
  return params;
}

export function cardImagePath(
  username: string,
  type: CardType,
  options: CardOptions,
) {
  const query = cardParams(options).toString();
  return `/api/card/${normalizeUsername(username)}/${type}${query ? `?${query}` : ""}`;
}

export function sampleImagePath(type: CardType, options: CardOptions) {
  const query = cardParams(options).toString();
  return `/api/sample/${type}${query ? `?${query}` : ""}`;
}

export function cardEditorPath(
  type: CardType,
  username = "",
  options: CardOptions = { layout: cards[type].layout, theme: "paper" },
) {
  const params = cardParams(options);
  if (username) params.set("username", normalizeUsername(username));
  const query = params.toString();
  return `/cards/${type}${query ? `?${query}` : ""}`;
}
