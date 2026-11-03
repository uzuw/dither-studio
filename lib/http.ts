import { PublicError } from "./types";

export function responseHeaders(success: boolean, svg = false): Headers {
  const headers = new Headers({
    "Cache-Control": success
      ? "public, max-age=0, must-revalidate"
      : "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": svg
      ? "image/svg+xml; charset=utf-8"
      : "application/json; charset=utf-8",
  });
  if (success)
    headers.set(
      "CDN-Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
  if (svg)
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
  return headers;
}

export function publicFailure(error: unknown): PublicError {
  const failure =
    error instanceof PublicError
      ? error
      : new PublicError(
          "This print is temporarily unavailable. Try again later.",
          503,
        );
  console.error(
    JSON.stringify({ event: "dither_request_failed", status: failure.status }),
  );
  return failure;
}
