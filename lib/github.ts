import "server-only";
import { unstable_cache } from "next/cache";
import { requestProfile } from "./github-client";
import { normalizeUsername } from "./recipe";

const cachedProfile = unstable_cache(
  async (username: string) =>
    requestProfile(username, process.env.GITHUB_TOKEN),
  ["dither-public-profile-v3"],
  { revalidate: 3600 },
);

export function getProfile(username: string) {
  return cachedProfile(normalizeUsername(username));
}
