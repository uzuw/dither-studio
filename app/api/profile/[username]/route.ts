import { getProfile } from "../../../../lib/github";
import { normalizeUsername } from "../../../../lib/recipe";
import { PublicError } from "../../../../lib/types";
import { publicFailure, responseHeaders } from "../../../../lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const url = new URL(request.url),
      username = normalizeUsername((await context.params).username);
    if (url.search)
      throw new PublicError(
        "The profile endpoint does not accept query options.",
      );
    if (url.pathname !== `/api/profile/${username}`)
      return new Response(null, {
        status: 307,
        headers: { Location: `/api/profile/${username}` },
      });
    return Response.json(await getProfile(username), {
      headers: responseHeaders(true),
    });
  } catch (error) {
    const failure = publicFailure(error),
      headers = responseHeaders(false);
    if (failure.retryAfter)
      headers.set("Retry-After", String(failure.retryAfter));
    return Response.json(
      { error: failure.message },
      { status: failure.status, headers },
    );
  }
}
