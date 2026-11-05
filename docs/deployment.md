# Deployment and operations

## Vercel setup

1. Import your public fork into the intended Vercel account/team as a Next.js
   project. Use the repository root and `npm run build`; choose Node.js 22+.
2. Create a fine-grained GitHub credential with public access sufficient for the
   query in `lib/github-client.ts`. Add it as server-only `GITHUB_TOKEN`, scoped
   to the environments you intend to test. Never use a `NEXT_PUBLIC_` prefix.
3. Deploy and use a stable production domain. Open the studio on that domain,
   generate a real username, and copy the Markdown it produces.
4. Verify the card in an actual GitHub README. A local browser success is not
   proof that GitHub's image proxy has fetched it.

The public studio is `https://dither-studio-olive.vercel.app`. Its home page is a
card gallery; dedicated pages include `/cards/pull-requests`, `/cards/stars`,
`/cards/streaks`, and `/cards/frequency`. Each page exports
`/api/card/USERNAME/TYPE`, using the same SVG as its preview.

No application database, cron, external renderer, or visitor authentication is
required. `/skill` serves the tracked skill; its file is explicitly included in
Next's deployment trace. `serverExternalPackages` preserves the Node SVG renderer.

## Credentials and visibility

Use the least permissions needed for **public data**. GitHub's contribution
calendar depends on the credential's visibility. A broad personal credential
may include private activity, particularly for its owner. Do not deploy the
developer's GitHub CLI token or copy it into environment files. Check the actual
public-access credential against its owner and at least one unrelated account.

The application requests login, collection bounds, contribution calendar,
period PR/review/issue/commit counters, and public owned repository names,
descriptions, stars, forks and ownership/privacy checks. It never requests
private repositories or privileged profile fields. PUBLIC and OWNER filters
apply on every repository page, including token-owner lookups. Star totals sum
all pages under one 20-second deadline; a page failure fails the full lookup
instead of exposing partial totals. The top five repositories are retained in
public responses; arbitrary designs do not trigger separate GitHub fetches.
This does not by itself prove a credential is correctly scoped.
Count differences from an owner's signed-in GitHub view can be expected.

If credentials are missing, invalid, or expired, live routes return safe errors,
not mock activity. Fix the server-side secret, redeploy, and retry. Never print
tokens in diagnostics. Existing cached successes may remain until revalidation.

## Caching contract

- `unstable_cache` stores normalized successful profile data for one hour, keyed
  by normalized username and query version. It uses the framework Data Cache;
  GitHub POSTs explicitly use `no-store` inside that cached function.
- Invalid input fails before the GitHub call. Data is independent of layout,
  theme, and custom recipes; changing design should reuse the same profile.
- Successful API responses set `Cache-Control: public, max-age=0, must-revalidate`
  and `CDN-Cache-Control: public, max-age=300, stale-while-revalidate=600`.
- Failures set `Cache-Control: no-store`. They never replace successful data with
  zeros. Next's stale data behavior depends on the deployed cache implementation;
  the app makes no promise to synthesize stale data when there is no cached success.
- Quota responses include `Retry-After` when available. There are no automatic
  upstream retries. Dates and metrics come from the actual cached fetch time.
- GitHub Camo is another cache outside this application's control. Do not promise
  live freshness or add timestamp parameters to copied URLs.

Next's Data Cache must be backed by the deployment platform. No in-process Map
or server filesystem is used as a distributed cache. Before upgrading the
framework, consult the bundled docs and recheck stale/error behavior.

## Before opening public traffic

- Verify the exact GitHub credential cannot expose private activity in a token-owner lookup.
- Verify successful SVG content type, XML, no external resources, error status codes,
  no token in responses/client bundles, and actual GitHub README rendering.
- Compare `fetchedAt` across repeated requests and theme/layout variants. Check
  `x-vercel-cache` and CDN headers on the deployment, not just localhost.
- Check your Vercel plan limits and expected API budget. Configure suitable
  platform request/abuse limits; GitHub Camo may share proxy IPs, so avoid blindly
  treating each shared proxy as a single abusive visitor.
- Keep the image routes public and free of browser-only challenges. Test any
  deployment protection against a real image-proxy request.
- Monitor quota errors, cache hits, and traffic before decreasing cache times.
  A successful small-scale test is not a free-at-any-scale guarantee.

The implementation includes structured status-only error logging. It deliberately
does not log raw upstream error bodies, credentials, or private repository data.
If the token's quota is exhausted, allow the reset window, investigate uncached
traffic, and adjust cache/abuse settings. Do not rotate many personal tokens to
evade GitHub's limits.

## API traffic observation draft

On 2026-11-05, a validated rule was staged for this project:
`rule_dither_git_hub_api_traffic_observation_at5mMu`.
Its source is [examples/firewall-api-observe.json](../examples/firewall-api-observe.json).

- Scope: `GET /api/profile/*` or `GET /api/card/*`, including legacy image routes.
- Threshold: 300 requests per IP per 60 seconds, fixed window, per region.
- Threshold action: **log**. This observes traffic without blocking or challenges.
- Gallery samples, editor pages, other methods and other routes are excluded.

The draft is not active in production. In the
[Vercel Firewall dashboard](https://vercel.com/uzuws-projects/dither-studio/firewall),
review the single staged change and publish it to begin observing traffic.
The equivalent CLI commands, with an authenticated Vercel CLI, are:

```sh
vercel firewall diff --scope uzuws-projects --project dither-studio
vercel firewall publish --scope uzuws-projects --project dither-studio --yes
```

Publishing firewall settings does not require an app deployment. Review real
traffic before switching the threshold action to 429. GitHub Camo and corporate
networks can share source IPs; do not introduce browser challenges or low IP
limits on image routes. Rate limiting counts are regional and do not impose a
global GitHub API budget. Review your plan's
[rate-limit usage and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
before publishing or changing the rule.

## Static generation alternative

The CLI can generate SVGs directly into your profile repository. Relative image
links then need no Dither hosting service. The refresh example uses the target
repository's Actions token for public data and updates only generated assets.
Review the generator commit and pin it before letting a scheduled job run with
repository write permissions. Keep your root README under your control.
