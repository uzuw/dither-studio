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

No application database, cron, external renderer, or visitor authentication is
required. `/skill` serves the tracked skill; its file is explicitly included in
Next's deployment trace. `serverExternalPackages` preserves the Node SVG renderer.

## Credentials and visibility

Use the least permissions needed for **public data**. GitHub's contribution
calendar depends on the credential's visibility. A broad personal credential
may include private activity, particularly for its owner. Do not deploy the
developer's GitHub CLI token or copy it into environment files. Check the actual
public-access credential against its owner and at least one unrelated account.

The application requests only login, collection bounds, and contribution calendar
dates/counts/levels. It does not enumerate repository identities or request private
profile fields. This does not by itself prove a credential is correctly scoped.
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

## Static generation alternative

The CLI can generate SVGs directly into your profile repository. Relative image
links then need no Dither hosting service. The refresh example uses the target
repository's Actions token for public data and updates only generated assets.
Review the generator commit and pin it before letting a scheduled job run with
repository write permissions. Keep your root README under your control.
