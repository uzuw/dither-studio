import { sampleProfile } from "../../../lib/demo";
import { parseOptions, optionParams } from "../../../lib/recipe";
import { renderCard, renderError } from "../../../lib/card";
import { publicFailure, responseHeaders } from "../../../lib/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      options = parseOptions(url.searchParams);
    const query = optionParams(options).toString(),
      canonical = `/api/sample${query ? `?${query}` : ""}`;
    if (url.pathname + url.search !== canonical)
      return new Response(null, {
        status: 307,
        headers: { Location: canonical },
      });
    return new Response(renderCard(sampleProfile(), options, true), {
      headers: responseHeaders(true, true),
    });
  } catch (error) {
    const failure = publicFailure(error);
    return new Response(renderError(failure.message), {
      status: failure.status,
      headers: responseHeaders(false, true),
    });
  }
}
