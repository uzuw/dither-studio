# Contributing

Fork the repository, install with `npm ci`, and run `npm run dev`. The sample
studio works without a token. Use your own public-access token for live checks;
never add credentials or private activity snapshots to a contribution.

Keep changes focused. Recipe examples belong in `examples/`; a reusable renderer
feature needs corresponding runtime validation, editor schema, documentation,
and a small meaningful test. Full source customization is welcome; preserve
accurate activity data, accessibility, safe SVG output, and reasonable image size.

Run `npm run check` before submitting a pull request. For a visual change, include
desktop/mobile screenshots, the recipe you tested, and a description of the
result. Check long text, keyboard use, reduced motion, and zero activity. If you
could not test GitHub image proxy behavior or live data, say so.

All contributions are made under the project's MIT license. Keep font and other
third-party asset licenses intact. Do not copy artwork without permission.

For a suspected vulnerability, avoid placing tokens or exploit details in a
public issue. Contact the repository maintainer privately through their profile,
or use GitHub's private vulnerability reporting if it is enabled for this repo.
