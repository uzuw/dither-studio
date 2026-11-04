# Customizing Dither

Recipes are ordinary JSON objects. Use them in the studio's recipe editor, in
the local renderer, or give them to an agent using the portable
[Dither skill](../skills/dither-readme/SKILL.md). Start with
[Blueprint](../examples/blueprint.json) or [After hours](../examples/after-hours.json).

## Recipe contract

| Field | Meaning | Bound |
| --- | --- | --- |
| `version` | Recipe format | `1` |
| `title` | Heading; empty uses username/default intro | 64 characters, one line |
| `subtitle` | Personal introduction in the profile header | 140 characters, one line |
| `tagline` | Card footer | 64 characters, one line |
| `font` | Exported system-font family | `sans`, `mono`, `serif` |
| `pattern` | Activity texture | `bayer`, `dots`, `weave` |
| `radius` | Outer corner radius, in SVG units | Integer, 0–24 |
| `palette` | `background`, `foreground`, `muted`, `accent`, `grid` | Each is `#RRGGBB` |
| `metrics` | Ordered subset of supported metrics | 1–8 unique items |
| `chartStyle` | Contribution curve rendering | `area`, `line`, `bars` |
| `groupBy` | UTC curve buckets | `day`, `week`, `month` |
| `repoCount` | Top public owned repositories to show | Integer, 1–5 |
| `links` | CLI social panels: `{ "label": "Website", "url": "https://…" }` | Up to 4; label 24 chars; URL 200 chars |

Supported metric IDs: `contributions`, `pullRequests`, `reviews`, `issues`,
`commits`, `stars`, `repositories`, `activeDays`, `currentStreak`, `longestStreak`.
`metrics` controls metric cards, in the order given and within their allowed set. Most
metrics cover the displayed contribution period; `stars` and `repositories`
are current totals across public owned repositories, including forks.

The gallery links to dedicated pages at `/cards/{type}`. Supported types:
`stats`, `pull-requests`, `stars`, `streaks`, `frequency`, `rhythm`, `distribution`,
`streak-spectrum`, `repositories`, `calendar`, and `profile`.

| Card | Allowed metrics |
| --- | --- |
| `stats` | `contributions`, `commits`, `activeDays` |
| `pull-requests` | `pullRequests`, `reviews` |
| `stars` | `stars`, `repositories` |
| `streaks` | `currentStreak`, `longestStreak`, `activeDays` |

Each type has `/api/card/USERNAME/TYPE` and `/api/sample/TYPE` SVG routes.
Use only `theme` and `recipe` on those image routes; `layout` is rejected.
A recipe may select/reorder a subset of that card's metrics. Other metrics are
rejected before an upstream request. Curves, distributions, repository lists
and headers are separate cards. `/cards/streaks` is the streak summary;
`/cards/streak-spectrum` is the run-length chart.

Legacy `/api/card/USERNAME?layout=...` keeps the nine renderer layouts, including
`overview`; omitted layout still means calendar. Combined overview is available
only through the legacy image contract and source renderer.

`frequency` shows exact counts by UTC day/week/month; partial weeks/months are
included without extrapolation. `rhythm` averages by observed weekday count.
`distribution` counts days in fixed count bins (including zero); those bins do
not change GitHub's calendar activity levels. `streak-spectrum` shows how many active
runs of each length occur; gaps and zeros break runs, and period edges bound them.
These are alternate views of public activity, not measures of developer quality.

Fields may be omitted; defaults fill them. Unknown fields are rejected to catch
typos. Text cannot contain control characters. Links require HTTPS, a nonblank
label, and no URL credentials. They appear as linked panels in the locally
generated README; a hosted image cannot itself contain separately clickable
links. `subtitle` and `links` are profile-specific; the graph stays focused on
activity, and the stats card stays focused on its metrics.

The [JSON schema](../schema/recipe.schema.json) supports editor tooling; runtime
validation in [lib/recipe.ts](../lib/recipe.ts) is authoritative. Reference the
schema through your editor's association settings rather than putting a
`$schema` property in the recipe. Check contrast after changing colors; arbitrary
user colors cannot be guaranteed accessible automatically.

## Hosted customization

The studio serializes the resolved recipe as UTF-8 JSON, encodes it using
base64url, and sets the `recipe` query parameter. This is encoding, not encryption:
all recipe text and links are public. Do not put secrets or private information
in a recipe. The image URL carries the design; there is no saved account state.

Decoded recipes are limited to 2,400 bytes (3,200 encoded characters). Use local
exports/source customization for larger designs. Supported parameters are only
`layout`, `theme`, and `recipe`; repeated/unknown parameters are rejected before
GitHub is called. Defaults, casing, parameter order, and recipe encoding resolve
to a canonical image URL. A complete custom recipe supplies its own palette,
so the redundant theme parameter is omitted from the canonical URL.

The editor URL carries its card type in the path and `username` in the query, making a design shareable.
Download a recipe to keep an editable version outside the URL.

## Customize beyond recipes

| Change | Edit |
| --- | --- |
| New artwork or SVG composition | `lib/card.tsx`, `lib/charts.tsx` |
| Add a portable option | `lib/recipe.ts`, schema, studio controls, this guide |
| Metric meaning or UTC calculations | `lib/stats.ts` and its tests |
| New GitHub data fields | `lib/github-client.ts`, normalization, fixtures, credential review |
| Website layout/motion | `components/generator.tsx`, `app/globals.css` |
| Generated README/social composition | `scripts/render.tsx` |
| Agent workflow | `skills/dither-readme/SKILL.md` |

Global CLI recipes are filtered to each card's allowed metrics; if none match,
that card uses its own defaults. For a hosted editor, use a recipe scoped to its
card type. `lib/cards.ts` owns this mapping and default behavior.

The renderer uses React's explicit Node server entrypoint. `next.config.ts`
externalizes `react-dom` so Next's Server Component conditions do not substitute
the unsupported React server export. The same renderer runs in the CLI.

Dither levels fill 0/4/8/12/16 locations of a deterministic 4×4 ordered tile.
Patterns are defined once and reused. Zero activity remains empty; density
increases without changing counts or dates. Do not add decorative dots to the
data area that can be confused with contributions.

Arbitrary layouts and bespoke art are source changes. There is no untrusted
JavaScript/template execution endpoint. New SVGs must remain self-contained,
XML-escaped, accessible, and readable without animation. Website font files do
not automatically work in image contexts; exact custom typography needs a
licensed embedded-font or glyph-path solution and image-client verification.

## Compose a personal README

The local CLI writes all eleven focused cards, social panels,
the recipe, and a data snapshot. Older calendar-only snapshots render unavailable
profile metrics as dashes; regenerate live data to populate those metrics. Its README embeds local SVGs and wraps each
social panel in an HTTPS anchor. Put those files together in a profile repository
or adjust paths when moving the Markdown into a larger README.

The example recipe references the publicly supplied profile as inspiration;
replace the name, copy, and links with your own. The generated landscape is
deterministic geometry, not copied ocean artwork from the reference.

Inspect the files in a browser before publishing. For recipe-only work, rendering
and visual checks are enough. For source changes run `npm run check`, then test
the actual exported images. Keep honest labels for samples and cached data.
