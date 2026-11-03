import { getProfile } from "../../../../lib/github";
import {
  cardPath,
  normalizeUsername,
  parseOptions,
} from "../../../../lib/recipe";
import { renderCard, renderError } from "../../../../lib/card";
import { publicFailure, responseHeaders } from "../../../../lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const url = new URL(request.url),
      username = normalizeUsername((await context.params).username);
    const options = parseOptions(url.searchParams),
      canonical = cardPath(username, options);
    if (url.pathname + url.search !== canonical)
      return new Response(null, {
        status: 307,
        headers: {
          Location: canonical,
          "Cache-Control": "public, max-age=300",
        },
      });
    const profile = await getProfile(username);
    return new Response(renderCard(profile, options), {
      headers: responseHeaders(true, true),
    });
  } catch (error) {
    const failure = publicFailure(error),
      headers = responseHeaders(false, true);
    if (failure.retryAfter)
      headers.set("Retry-After", String(failure.retryAfter));
    return new Response(renderError(failure.message), {
      status: failure.status,
      headers,
    });
  }
}
