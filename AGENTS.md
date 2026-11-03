# Project instructions

## Product

Build a public GitHub contribution graph and stats generator, hosted on Vercel.
A visitor enters a GitHub username, sees a dithered card, chooses a palette, and
copies a working Markdown image embed into their profile README.

Working name: **Dither**. Treat “status” in the initial brief as profile stats,
not availability, GitHub service health, or permission to change a user's status.
Reference research and the reasons for these decisions live in
[docs/research.md](docs/research.md).

## Scope and working style

- This repository contains the Next.js studio, shared SVG renderer, local README
  exporter, and portable skill at `skills/dither-readme/SKILL.md`.
- When implementing, finish the username → real data → preview → README flow
  before adding more templates or controls.
- Use the smallest complete change. Reuse existing code and platform features;
  add a dependency only for a concrete need that they cannot reasonably cover.
- Read affected callers, configuration, fixtures, and tests before changing a
  contract. Keep secrets and private data out of public output.
- Make routine decisions and continue; ask only when required information is
  unavailable or an action exceeds the user's authorization.
- Keep this file current when an implemented decision changes. Do not mark
  requirements as verified without evidence.

## First release

1. One generator page with a labeled username field and Generate button.
2. Three card layouts: `calendar`, `stats`, and `profile`. Calendar includes its contribution
   total; stats shows total contributions, active days, current streak, and
   longest streak within the displayed period.
3. Two starting palettes: `paper` and `midnight`; ordered pixels, halftone dots,
   and woven ink textures. Bounded JSON recipes customize colors, text, corners,
   fonts, and links. Agents can edit source for arbitrary compositions.
4. A preview using the exact SVG endpoint used in the generated README snippet.
5. Copy Markdown, copy image URL, and download the same SVG.
6. Shareable generator URLs preserving username, layout, and palette.
7. A portable agent skill and CLI for profile headers, calendars, stats, linked
   social panels, and local Markdown, plus documented source extension points.
8. Useful loading, invalid username, user not found, empty activity, unavailable
   credentials, quota exhausted, and upstream failure states.

No accounts, visitor tokens, database, billing, AI generation, language rankings,
avatar processing, lifetime statistics, or animation exports
in the first release. Add these only in response to a demonstrated need.

## Visual direction

Make this feel like a digital print studio. The dithered calendar is the focal
point. Keep surrounding controls quiet and left aligned; show a useful sample
immediately, clearly marked as a sample until a real lookup succeeds.

| Token | Value | Role |
| --- | --- | --- |
| Paper | `#F5F7FA` | Light canvas |
| Ink | `#172033` | Main text; dark canvas |
| Cobalt | `#3454F5` | Primary action and light-theme activity |
| Mist | `#DCE3EF` | Empty cells and separators |
| Slate | `#69758A` | Secondary text, subject to contrast checks |
| Blue light | `#A9C2FF` | Dark-theme activity and focus accents |

- Website type: self-hosted Bricolage Grotesque for headings/body and IBM Plex
  Mono for numbers/code. Preserve font licenses. Use system fallbacks.
- SVG type: self-contained system font stacks, ample text bounds, and tabular
  figures. Website fonts do not automatically work in an image. If exact custom
  typography later becomes necessary, verify a licensed glyph-to-path approach.
- Use a consistent small SVG icon set; icons support visible labels. No emoji
  standing in for controls, decorative icon grids, or unlabeled icon buttons.
- Desktop: narrow controls beside a large preview; export code directly below
  it. Mobile: input, controls, preview, then export, in that order.

```text
Dither                                      Source
Your GitHub, printed differently.
[ GitHub username                         ] [Generate]

[ Layout        ]   [ Actual SVG preview              ]
[ Paper/Midnight]   [ calendar or stats                ]
                    [ Markdown snippet      ] [Copy]
                    [Copy image URL] [Download SVG]
```

- One short, user-triggered print/reveal transition after generation; subtle
  palette transitions and copy feedback. Use CSS first, no motion library.
- Honor `prefers-reduced-motion`; never animate individual dots continuously.
- Build readable, static README images. Website motion is an enhancement.
- Visible focus, proper form labels, meaningful image alt text, live status
  announcements, and usable contrast are required. Do not rely on color alone.
- At 360px viewport width, avoid page overflow. Keep calendar weeks intact in a
  labeled scroll region if scaling would make dates and cells unreadable.
- Before coding the UI, review this direction against the brief. During browser
  QA, inspect desktop/mobile screenshots and remove unnecessary decoration.

## Dither and calendar rules

- Keep GitHub's calendar semantics: weeks in columns, weekdays in rows, month
  labels, five activity levels, and a visible density legend.
- Map `NONE`, `FIRST_QUARTILE`, `SECOND_QUARTILE`, `THIRD_QUARTILE`, and
  `FOURTH_QUARTILE` to increasing densities. Use GitHub's supplied levels;
  do not invent count thresholds that change the meaning of the graph.
- Use one deterministic 4×4 ordered threshold tile. The five levels use
  0, 4, 8, 12, and 16 filled positions respectively. Each level must contain
  every position filled by the previous level. Zero activity stays visibly empty.
- Define reusable SVG patterns once, then reference them per day. Avoid raster
  noise, expensive filters, random layouts, and separate nodes per tiny pixel.
- Distinguish padding/future dates from actual zero-contribution days. Use the
  returned week/date structure; do not assume every calendar has 53 full weeks.
- Counts and dates stay exact even when the visual representation is stylized.

## Architecture

- One Next.js App Router app with TypeScript, React, and ordinary CSS. Use the
  default Node.js server runtime on Vercel. No separate backend service.
- At scaffolding time, resolve supported stable package versions, pin them in a
  lockfile, and consult version-matched Next.js docs for routing and caching.
- Use native `fetch` for GitHub GraphQL. No GitHub SDK or chart library needed.
- Keep the GitHub data module server-only. One shared, explicitly cached profile
  loader feeds both public endpoints; palette/layout changes never refetch data.
- Use a shared SVG component rendered to static markup on the server via
  `react-dom/server.node`, externalized in `next.config.ts`. The
  website displays the resulting endpoint as an image, avoiding preview drift.
- Do not fetch the app's own HTTP endpoints from server code; call shared code.

Suggested files; create them only as implementation reaches them:

```text
app/page.tsx                          generator
app/api/profile/[username]/route.ts   JSON for generator states and summary
app/api/card/[username]/route.ts      README-compatible SVG
components/generator.tsx              form, controls, preview, export
lib/github.ts                        server-only query and cached loader
lib/stats.ts                         pure date/streak calculations
lib/card.tsx                         SVG layouts and dither patterns
lib/options.ts                       shared validation and option defaults
tests/                               focused fixtures and regression checks
```

## Public contracts

- `GET /api/profile/{username}` returns sanitized profile/calendar data, derived
  stats, period boundaries, and the actual upstream fetch timestamp.
- `GET /api/card/{username}?layout=calendar&theme=paper` returns SVG.
  Supported layouts: `calendar|stats|profile`; themes: `paper|midnight`.
  Optional `recipe` is base64url UTF-8 JSON, validated by `lib/recipe.ts`,
  documented in `docs/customization.md`, and described by the editor schema.
  Keep those contracts and the portable skill aligned when adding options.
- Omitted options use `calendar` and `paper`. Reject invalid/unknown options
  without fetching GitHub. Normalize username case, parameter order, and explicit
  defaults to one canonical URL so arbitrary variants cannot fragment the cache.
- Validate username shape and length before fetching. Accept only a GitHub
  login, not an arbitrary URL. Use GraphQL variables, never string interpolation.
- Construct copied URLs with `URL`/`URLSearchParams`; include only supported
  options. Use the current public site origin; document a stable production
  domain. Do not ship a fake working deployment URL.
- Recipes are public, bounded to 2,400 decoded bytes, and cannot contain code,
  external SVG resources, or credentials. Their social links become separate
  linked panels only in CLI Markdown; image contents are not clickable regions.
- Return JSON errors from the profile endpoint and a readable, safe SVG error
  card from the image endpoint. Preserve meaningful HTTP status codes:
  400 invalid input, 404 missing user, 429 quota limit, 503 unavailable upstream
  or server configuration. Never turn missing data into a successful zero.
- SVG responses use `image/svg+xml; charset=utf-8`, an XML namespace, `viewBox`,
  accessible title/description, and `X-Content-Type-Options: nosniff`.
- SVGs contain no scripts, `foreignObject`, external fonts/images/styles, or
  user-provided markup. Escape all dynamic text; allowlist style values.

Example Markdown shape, using an explicitly illustrative domain:

```md
[![octocat's GitHub contribution calendar](https://YOUR-DOMAIN/api/card/octocat?layout=calendar&theme=paper)](https://github.com/octocat)
```

## Data truth and credentials

- Query `user(login:)` and its default trailing-year `contributionsCollection`.
  Select calendar totals, weeks, day dates/counts/levels, and collection
  boundaries. Avoid repository enumeration and privileged profile fields.
- Label this as contributions in the displayed period, never “all commits.”
  Show the actual date range. Longest streak is “Longest streak in period.”
- Active days have count > 0. Current streak ends today if today is active;
  otherwise allow yesterday as the endpoint. If neither is active, it is zero.
  Both streak metrics are bounded by the returned period; never claim lifetime
  accuracy for a streak crossing its start.
- Use UTC day boundaries and GitHub date strings consistently. Avoid local-time
  date arithmetic. Handle leap days, missing days, partial weeks, and new users.
- Store the operator's public-access GitHub credential in server-only
  `GITHUB_TOKEN`. Never use a `NEXT_PUBLIC_` token or ask visitors for one.
- Provision the least permissions compatible with the actual query; do not
  request broad private repository access. Verify the query using the intended
  credential, including a lookup of its owner, before public launch.
- Only expose publicly visible data. Anonymized private contribution counts may
  appear when GitHub makes them visible; never request private repository
  identities or promise parity with the account owner's authenticated view.
- Handle GraphQL `errors` even on HTTP 200, malformed responses, authentication
  failures, timeouts, and rate limits. Keep upstream error bodies and secrets
  out of client output and logs. Abort slow upstream calls; no retry loops.

## Caching and public operation

- Start with a 1-hour shared upstream-data TTL keyed by normalized username and
  query version, independent of layout/theme. Explicitly verify GraphQL POST
  caching with the installed framework; do not assume fetch caches by default.
- Cache successful public JSON/SVG responses at Vercel for 5 minutes with a
  short stale-while-revalidate window. Use browser `max-age=0` and explicit CDN
  headers; verify actual deployed behavior. These are tunable initial policies.
- Avoid long caching for errors. Never overwrite a known good cached profile
  with an upstream failure or zeros. Serve stale data only if a genuine cached
  success is available, with its original timestamp; otherwise report failure.
- Preserve upstream `Retry-After`/reset information where appropriate. Read rate
  headers and stop automatic retries when quota is exhausted.
- Do not use a module-level Map or local disk as a shared cache/rate limiter.
  Document the deployed cache's actual revalidation/failure behavior.
- Treat GitHub Camo as another cache: README freshness is outside our complete
  control. Say “cached updates,” never “real time.” Do not add timestamp query
  parameters to bypass caches.
- Before inviting public traffic, configure available platform abuse limits and
  check costs/quotas. Account for legitimate shared image-proxy traffic; do not
  put a browser challenge/login in front of README image routes.
- Document Vercel setup, environment variables, stable domain, token expiry,
  caching policy, and recovery from token exhaustion. No database or cron needed.

## Verification and delivery

- Add small, meaningful tests for nontrivial logic: monotonic dither levels;
  empty, today/yesterday, gap, leap-day, and period-boundary streaks; username
  and option validation; escaped XML text; and GraphQL error handling.
- Assert zero-contribution users render correctly, padding does not affect
  counts, and missing users/quota failures do not become empty success cards.
- Check all layout/theme combinations, long usernames/numbers, and deterministic
  SVG output for fixed inputs. Target SVG size under 100 KB without external
  resources; measure before adding an optimizer or image library.
- Run the project's type check, lint, focused tests, and production build.
  Establish these scripts when scaffolding; do not claim they exist yet.
- Browser-check real lookup, rapid username changes/stale request cancellation,
  option changes, copy, download, keyboard use, reduced motion, and mobile layout.
- Verify on Vercel that preview and README URLs return the same SVG, the token
  never reaches browser bundles/responses, and repeated/style-variant requests
  reuse cached GitHub data. Use a real GitHub README to verify Camo rendering.
- Offline fixtures are for tests and clearly labeled demo states. Production
  lookups use real GitHub data. Report any live checks blocked by credentials.
- Deliver in this order: real data + tested stats → SVG renderer → generator UI
  + export → deployment checks. Report what changed, what passed, and what remains.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
