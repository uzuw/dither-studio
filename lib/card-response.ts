import { getProfile } from "./github";
import { sampleProfile } from "./demo";
import {
  cardPath,
  optionParams,
  normalizeUsername,
  parseOptions,
} from "./recipe";
import {
  cardImagePath,
  sampleImagePath,
  parseCardType,
  parseCardOptions,
  resolvedCardOptions,
} from "./cards";
import { renderCard, renderError } from "./card";
import { publicFailure, responseHeaders } from "./http";

export async function cardResponse(
  request: Request,
  username?: string,
  card?: string,
) {
  try {
    const url = new URL(request.url),
      login = username === undefined ? undefined : normalizeUsername(username);
    const type = card === undefined ? undefined : parseCardType(card);
    const options = type
      ? parseCardOptions(type, url.searchParams)
      : parseOptions(url.searchParams);
    const legacyQuery = optionParams(options).toString();
    const canonical = type
      ? login
        ? cardImagePath(login, type, options)
        : sampleImagePath(type, options)
      : login
        ? cardPath(login, options)
        : `/api/sample${legacyQuery ? `?${legacyQuery}` : ""}`;
    if (url.pathname + url.search !== canonical)
      return new Response(null, {
        status: 307,
        headers: {
          Location: canonical,
          "Cache-Control": "public, max-age=300",
        },
      });
    const profile = login ? await getProfile(login) : sampleProfile();
    return new Response(
      renderCard(
        profile,
        type ? resolvedCardOptions(type, options) : options,
        !login,
      ),
      { headers: responseHeaders(true, true) },
    );
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
