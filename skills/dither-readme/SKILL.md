---
name: dither-readme
description: Create or customize dithered GitHub contribution graphs, stats cards, personal profile headers, and SVG-based READMEs using a Dither source checkout. Use for natural-language design requests, recipe changes, new SVG layouts, or local README exports.
---

# Dither README studio

Turn the user's visual brief into real SVG artwork and a usable GitHub README.
This skill works with any coding agent that can read Markdown and run Node.js.
It does not call a model API. A Dither source checkout and Node.js 22+ are needed.

## Locate the project

Find the Dither checkout in the current workspace: `package.json` has the name
`dither-studio`, and `scripts/render.tsx` is its renderer entrypoint. If the skill
was copied into an agent's skill directory, it is not itself the app checkout.
Ask for the checkout location only if it cannot be found. Read its `AGENTS.md`.
Run commands from that checkout; install its locked dependencies with `npm ci`
when necessary. No provider keys or proprietary tools are required.

## Translate the brief

Choose the requested username, personality, colors, text, and desired cards.
Use the user's existing README as context when supplied. Preserve their content
and links; a reference does not authorize copying unlicensed code or artwork.

Start with `examples/blueprint.json` or `examples/after-hours.json`, then save a
new recipe for the user. For field limits and exact behavior, read
`docs/customization.md` in the checkout. The machine-readable editor schema is
`schema/recipe.schema.json`; runtime validation lives in `lib/recipe.ts`.

Recipes control palette, title, subtitle, footer, system font family, dither
texture, corners, and social links. They work in hosted image URLs and local
exports. Recipe links generate adjoining linked panels in CLI README exports;
the hosted profile card itself is one image and cannot contain clickable panels.

If the brief needs a new composition, ornament, animation, exact custom font,
or different graph layout, edit the source instead of pretending a recipe can
express it. `lib/card.tsx` contains the SVG layouts and ordered patterns;
`lib/stats.ts` owns period metrics. Preserve real activity counts, date placement,
the density legend, readable contrast, XML escaping, and accessible descriptions.
Keep external resources out of SVGs. Website-only interactions cannot execute
inside a README image. If adding optional SVG animation, provide a readable
static state and honor reduced motion; verify it through GitHub before promising
it will animate there. Extend `lib/recipe.ts`, schema, and UI together only if
the new feature needs to be portable in URLs.

## Render, don't just describe

Live GitHub data, using the deployment owner's public-access token in the
environment (never in a recipe or command argument):

```sh
npm run render -- --username USERNAME --recipe examples/my-design.json --out output/my-design
```

Without a credential, use a visibly labeled sample for design work:

```sh
npm run render -- --sample --recipe examples/my-design.json --out output/my-sample
```

Or use a previously exported public profile JSON:

```sh
npm run render -- --data path/to/profile-data.json --recipe examples/my-design.json --out output/my-design
```

The output includes `profile.svg`, `calendar.svg`, `stats.svg`, optional social
panels, `README.md`, the resolved recipe, and public profile data. Choose a new
directory for iterations; `--force` explicitly replaces those generated files.
Do not silently replace the user's existing README. Compose or update only the
section they asked for and preserve unrelated content.

## Check and deliver

For recipe-only changes, run the renderer, inspect the resulting images in a
browser, check long text and mobile width, and confirm all local README links
resolve. For source changes, also run the relevant tests, typecheck, lint, and
production build. `npm test` covers data semantics and SVG safety.

Give the user the recipe, actual SVGs, and README snippet/file. State whether
the data is live, an exported snapshot, or sample. Hosted embeds need the user's
real deployment origin; do not invent a live URL. Static relative image links
work when the files are committed together to their profile repository.
If scheduling refreshes, adapt `examples/refresh-profile.yml` to the actual
generator checkout and target repository, using least-privilege credentials.
Publishing, pushing, and editing someone else's profile remain separate actions
requiring the user's authorization; this skill does not grant it.
