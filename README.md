# dither.

**Your GitHub, in print.** A contribution graph and profile artwork studio with
ordered pixels, halftone dots, and a little more personality.

Enter a GitHub username, choose a layout, customize the design, and copy one line
into your README. Or give the included skill to your coding agent and make a
whole profile of your own. Open source under the [MIT license](LICENSE).

[Open the studio](https://dither-studio-olive.vercel.app) · [Get the agent skill](skills/dither-readme/SKILL.md)

![A Dither contribution calendar with clearly labeled sample data](https://dither-studio-olive.vercel.app/api/sample?theme=midnight)

[Static artwork preview](docs/preview.svg)

## Run the studio

Requires Node.js 22+ and npm.

```sh
git clone https://github.com/uzuw/dither-studio.git
cd dither-studio
npm ci
cp .env.example .env.local
# Set GITHUB_TOKEN in .env.local using your editor.
npm run dev
```

Open [the local studio](http://localhost:3000). Without a credential, the clearly
labeled sample and design controls still work; live lookups show a configuration
error. There is no fake-data fallback for real usernames.

Use a fine-grained GitHub credential with only the public access needed by the
query. Keep it server-side. Broad `repo`/`read:user` permissions can change what
the token owner sees; never deploy a personal, private-repository credential to
this public service. Validate the intended public-access token before launch.

## What you can make

- **Contribution calendar:** real week/day placement, five activity densities,
  month labels, contribution total, and active days.
- **Stats card:** contributions, active days, current streak, and longest streak
  in the returned period. These are contributions, not lifetime commit totals.
- **Profile header:** your introduction, a deterministic dithered landscape, and
  matching colors/type. Local exports can add linked social panels.

Paper and Midnight are starting palettes. Customize every palette color, choose
three textures and three portable font families, change copy and corners, or edit
the JSON recipe. The preview and README use the **same self-contained SVG**.
Website motion respects reduced motion; exports are static and readable.

## Make it with an agent

The portable entrypoint is [skills/dither-readme/SKILL.md](skills/dither-readme/SKILL.md).
Give Codex, Claude, Hermes, or another coding agent this prompt in a Dither checkout:

> Read `skills/dither-readme/SKILL.md`. Make a README for @your-name with a blue
> dithered landscape, a personal introduction, contribution graph, stats, and my
> social links. Save a recipe, render the actual SVGs, and show me the result.

The skill uses Markdown, JSON, TypeScript, and a local CLI. It requires no paid
model API and does not lock you to one agent. Read it directly, or copy the
`skills/dither-readme` folder into your agent's skill directory:

- Codex: `~/.codex/skills/dither-readme/`
- Claude Code: `~/.claude/skills/dither-readme/`
- Hermes/other agents: their configured skill directory, or direct-file loading.

Installing the skill does not install Dither itself. Keep a source checkout
available. The [customization guide](docs/customization.md) explains recipe
fields, source extension points, URL encoding, and README composition.

## Generate local SVGs and a README

Live data uses `GITHUB_TOKEN` in the process environment. The CLI does not
automatically load Next.js environment files. Node.js can load your local file:

```sh
node --env-file=.env.local --import tsx scripts/render.tsx \
  --username your-name --recipe examples/blueprint.json --out output/my-profile
```

If your environment already supplies the token:

```sh
npm run render -- --username your-name --recipe examples/blueprint.json --out output/my-profile
```

Or design without a credential:

```sh
npm run render -- --sample --recipe examples/after-hours.json --out output/sample
```

Sample images are visibly labeled. To regenerate from an exported public
snapshot, replace `--username` with `--data path/to/profile-data.json`.

Output contains `profile.svg`, `calendar.svg`, `stats.svg`, any `link-N.svg`
panels, `README.md`, `dither.recipe.json`, and public `profile-data.json`.
Copy the folder into your profile repository and adjust your root README to
point at it. A generated README assumes the SVGs are in the same directory.
Existing files are protected; use a new directory or explicitly pass `--force`
to replace generated targets. The CLI does not modify an existing root README.

For daily updates in your own repository, adapt
[examples/refresh-profile.yml](examples/refresh-profile.yml). It is an example,
not an enabled scheduler in this repository.

## Host on Vercel

Import your fork as a Next.js project, choose Node.js 22 or newer, and set a
public-access `GITHUB_TOKEN` as a server-only Secret. Deploy to a stable public
domain. No database, scheduler, or separate image service is needed.

The API contracts are:

```text
GET /api/profile/USERNAME
GET /api/card/USERNAME
GET /api/card/USERNAME?layout=stats&theme=midnight
GET /api/card/USERNAME?layout=profile&recipe=BASE64URL_JSON
GET /api/sample                 # visibly labeled example, never real activity
GET /skill                     # portable skill download
```

Generate the exact image URL and Markdown in your deployment's studio. Localhost
URLs cannot load from a GitHub README. See [deployment and caching](docs/deployment.md)
for credential checks, abuse controls, headers, and the launch checklist.

Profile data is cached for an hour independently of the design. Successful HTTP
responses have a five-minute CDN cache plus stale revalidation. GitHub proxies
README images and may retain them longer; updates are cached, not real time.
Streaks and dates use UTC. Private activity details are never requested; visible
anonymized counts depend on GitHub visibility and the deployment credential.

## Develop

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Or all four:
npm run check
```

Tests cover data validation, API errors, UTC streaks, safe recipes, monotonic
dither levels, SVG determinism/size, and the CLI's real output/overwrite guard.
Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for the file map.

Built with Next.js and React. Website fonts are Bricolage Grotesque and IBM Plex
Mono, supplied through Fontsource with their upstream licenses. Generated SVGs
use system-font stacks and have no external resources. The font licenses are
also served at `/font-licenses.txt`. Inspired by the simple
embed contracts in [existing README generators](docs/research.md) and the personal
composition in [uzuw's profile](https://github.com/uzuw/Uzuw). GitHub is a trademark
of GitHub, Inc.; this project is independent.
