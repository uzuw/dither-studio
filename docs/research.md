# Separate-card product direction

On 2026-11-04 the user clarified that each card type must have a distinct route
and focused SVG. The gallery replaces the default combined overview. PRs, stars,
streak summaries and charts are separate cards with their own editors and
embeds. Existing overview image URLs stay supported for compatibility.

---

# Current product direction

The user clarified on 2026-11-04: lead with PRs, stars, top repositories,
streaks and contribution frequency curves, with distinctive alternate graphs
and deeper composition controls. The classic calendar is an optional view.
The calendar-first recommendation below is historical and superseded.

The implemented views are overview, stats, frequency, weekday rhythm, activity
distribution, streak spectrum, repositories, calendar and profile. Do not claim
exclusive or first-of-their-kind graphs without a current competitor audit.

[GitHub's User/ContributionsCollection reference](https://docs.github.com/en/graphql/reference/users)
confirms period PR/review/issue/commit counters and public/ownership repository
filters. [Repository fields](https://docs.github.com/en/graphql/reference/repos)
provide stargazer and fork counts. Stars received are summed over all public
owned repository pages; starredRepositories would measure stars given instead.

---

# Dither: references and feasibility

Research date: 2026-11-03. This is a proposed build direction, not an implemented
or deployed product. The repository contained only Git metadata at inspection.

## Existing generators

| Reference | What it demonstrates | What to carry into this product |
| --- | --- | --- |
| [GitHub Readme Stats](https://github.com/anuraghazra/github-readme-stats) | URL-driven SVG cards, themes, and one-line Markdown embeds. Its README warns about public endpoint rate limits and identifies a successor. | Copy the easy embed contract and treat caching as core architecture. Do not depend on its public API. |
| [GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended) | The successor linked by Readme Stats. | Consult current implementations if comparing behavior; do not assume older deployment instructions remain current. |
| [Activity Graph generator](https://ashutosh00710.github.io/github-readme-activity-graph/) and [source](https://github.com/Ashutosh00710/github-readme-activity-graph) | A 31-day graph with username input, color/theme controls, preview area, and generated link. | Keep input → preview → copy visible together; make the full contribution calendar our recognizable visual. |
| [Streak Stats](https://github.com/DenverCoder1/github-readme-streak-stats) | Contribution total, current/longest streak, and a documented live-preview customizer. | Use understandable metrics and show their period. Its live demo timed out during this research. |
| [Capsule Render](https://github.com/kyechan99/capsule-render) | URL-generated decorative headers and text animation options. | Learn from the expressive art direction and simple links; keep our core embed readable without animation. |
| [Metrics](https://github.com/lowlighter/metrics) | Multiple output formats, templates, and a large plugin system. | A useful breadth reference; our first release should concentrate on one distinctive calendar and a matching stats card. |

These observations come from project documentation and text-accessible pages.
They are not a screenshot-based visual audit or reliability benchmark. The
opportunity is our design judgment: a coherent dither treatment and restrained
controls, rather than another large collection of theme switches.

## Recommended experience

A visitor arrives to a clearly labeled sample, enters a username, and gets their
actual contribution artwork. Controls offer two layouts and two palettes. The
export sits directly under the preview. Changing a palette should feel instant
because it changes rendering, not the GitHub data request.

The calendar keeps real weekday/week placement. Activity becomes increasingly
dense ordered dots, with a five-step legend. It must still work in monochrome.
The stats layout uses the same texture sparingly alongside exact numbers.

Choose Bricolage Grotesque for the website's distinctive type, restrained icons,
and one short print-like reveal after generation. Keep continuous decorative
motion out. This is a proposal, not an assertion that these references use or
lack those design choices.

The initial six-color palette and wireframe are in [AGENTS.md](../AGENTS.md).
Reviewing the first design pass against the brief led to one deliberate choice:
the data cells themselves carry the dither, so a generic dashboard cannot satisfy
the design just by adding a grain background.

## How README embedding works

Serve a public HTTPS URL returning SVG. Markdown embeds that URL as an image;
the website previews that exact image and offers its download. No visitor login
or executable widget is needed for this design.

GitHub uses Camo to proxy images and documents both content-type failures and
stale image caches. Therefore correct image headers and an actual GitHub README
test are release requirements. The app cannot guarantee immediate README
refreshes. [GitHub image proxy documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).

Implementation decision: use portable SVG geometry, patterns, text, and inline
presentation attributes. Avoid scripts, HTML in SVG, remote resources, and
required animation. Website motion can be richer without changing the artifact.
Custom website fonts will not automatically travel with the SVG; system font
fallbacks are the small initial solution, with preview/export using the same file.

## GitHub data and honest metrics

GitHub's GraphQL schema exposes a user's contribution calendar, total, weeks,
daily dates/counts, and contribution levels. Its collection defaults to the past
year. This supports the calendar and derived streaks without enumerating every
repository. Use supplied activity levels rather than guessed thresholds.
[GitHub Users schema](https://docs.github.com/en/graphql/reference/users#contributioncalendar).

Contributions cover several activity types, not just commits. “Current streak”
and “Longest streak in period” are calculations over returned calendar days.
Define the yesterday grace rule and test UTC boundaries; do not present a
trailing-year maximum as a lifetime record.

GitHub describes contribution timestamps as UTC and allows users to expose
anonymized private activity. Our output should show only what the service's
public-access credential can see, without requesting private repository details.
Exact agreement with an owner's signed-in graph is not promised.
[GitHub profile contribution visibility](https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile).

GraphQL requires authentication. The deployment operator supplies a server-only
credential; visitors supply only usernames. GitHub documents multiple token
types and notes that fine-grained tokens include public-repository read access.
Validate the exact query with the intended permissions before launch.
[GitHub GraphQL authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql).

## Vercel and running costs

Recommended stack: a single Next.js/TypeScript app, native fetch, a small shared
SVG renderer, and Vercel's default Node.js runtime. No database, image-rendering
browser, charting engine, scheduler, or separate API service is needed initially.

The request path is:

```text
Generator / GitHub README
           |
           v
Public SVG route -> shared cached profile -> GitHub GraphQL
           |
           v
Deterministic SVG -> Vercel CDN -> browser / GitHub image proxy
```

The JSON endpoint uses the same cached profile. Cache data by normalized
username independently of rendering options. Cache successful SVGs at the CDN
as well. A palette change should not spend another GitHub request.

Vercel documents CDN cache headers and stale-while-revalidate behavior. The
proposed starting policy is one hour for shared data and five minutes for CDN
responses; actual apparent freshness also includes GitHub's cache. Verify the
installed Next.js caching API and deployed headers rather than assuming default
GET/POST behavior. Do not rely on process memory as a distributed cache.
[Vercel cache headers](https://vercel.com/docs/caching/cache-control-headers).

GitHub's GraphQL budget is point-based, with primary and secondary limits;
5,000 points/hour is the documented baseline for user authentication, not an
unlimited visitor allowance. Inspect real rate headers, bound queries, preserve
reset information, and avoid automatic retry storms. Public growth can require
tighter refresh intervals, abuse controls, or later static generation.
[GitHub GraphQL limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

No free-at-any-scale claim is justified. Before public launch, check the actual
Vercel plan, image traffic, cache hit ratio, and credential budget. Keep the
README route publicly readable by image proxies.

## Build sequence and open verification

1. Fetch one real profile with the intended public-access credential. Verify
   visibility and error cases; implement focused date/streak tests.
2. Produce deterministic SVGs for both layouts and palettes. Check density,
   readable labels, byte size, and rendering without external resources.
3. Build the responsive generator and export actions around those URLs.
4. Verify the production build, Vercel caching, token isolation, and real GitHub
   README rendering before announcing a public service.

Still unverified: live authenticated query behavior, precise token permissions
for the final query, actual image rendering through Camo, font appearance across
image clients, performance, traffic capacity, and hosting cost. No app code,
deployment, or credentials were created as part of this planning pass.
