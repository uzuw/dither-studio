import { calculateStats, dateKey } from "./stats";
import { normalizeUsername, record } from "./recipe";
import { LEVELS, PublicError, type Day, type Profile } from "./types";

export const GITHUB_QUERY = `query DitherProfile($login: String!) {
  user(login: $login) {
    login
    contributionsCollection {
      startedAt endedAt
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
  }
}`;

const safeDate = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  dateKey(new Date(value)) === value;
const count = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid count");
  return value;
};

export function normalizeProfile(payload: unknown, fetchedAt: string): Profile {
  try {
    const data = record(payload),
      user = record(data.user),
      collection = record(user.contributionsCollection);
    const calendar = record(collection.contributionCalendar);
    if (typeof user.login !== "string") throw new Error("Invalid login");
    const username = normalizeUsername(user.login);
    const start = String(collection.startedAt),
      end = String(collection.endedAt);
    if (
      Number.isNaN(Date.parse(start)) ||
      Number.isNaN(Date.parse(end)) ||
      start > end
    )
      throw new Error("Invalid collection period");
    if (!Array.isArray(calendar.weeks) || calendar.weeks.length > 56)
      throw new Error("Invalid calendar");
    const seen = new Set<string>();
    const weeks: Day[][] = calendar.weeks.map((item) => {
      const week = record(item);
      if (
        !Array.isArray(week.contributionDays) ||
        week.contributionDays.length > 7
      )
        throw new Error("Invalid week");
      return week.contributionDays
        .map((item) => {
          const day = record(item),
            level = LEVELS.indexOf(
              day.contributionLevel as (typeof LEVELS)[number],
            );
          if (
            !safeDate(day.date) ||
            typeof day.weekday !== "number" ||
            day.weekday < 0 ||
            day.weekday > 6 ||
            !Number.isInteger(day.weekday) ||
            level < 0
          )
            throw new Error("Invalid day");
          const date = day.date as string;
          if (
            seen.has(date) ||
            new Date(`${date}T00:00:00Z`).getUTCDay() !== day.weekday
          )
            throw new Error("Inconsistent date");
          seen.add(date);
          return {
            date,
            weekday: day.weekday,
            count: count(day.contributionCount),
            level,
          };
        })
        .filter(
          (day) =>
            day.date >= start.slice(0, 10) && day.date <= end.slice(0, 10),
        );
    });
    const days = weeks.flat(),
      total = count(calendar.totalContributions);
    if (days.reduce((sum, day) => sum + day.count, 0) !== total)
      throw new Error("Inconsistent total");
    return {
      source: "github",
      username,
      start,
      end,
      fetchedAt,
      total,
      weeks,
      stats: calculateStats(days, dateKey(new Date(fetchedAt))),
    };
  } catch {
    throw new PublicError(
      "GitHub returned incomplete data. Try again later.",
      503,
    );
  }
}

export async function requestProfile(
  username: string,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<Profile> {
  const login = normalizeUsername(username);
  if (!token)
    throw new PublicError(
      "GitHub access is not configured on this deployment. The operator needs to set GITHUB_TOKEN.",
      503,
    );
  let response: Response;
  try {
    response = await fetcher("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "dither-studio",
      },
      body: JSON.stringify({ query: GITHUB_QUERY, variables: { login } }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new PublicError(
      "GitHub took too long to respond. Try again in a moment.",
      503,
    );
  }
  const retryValue = response.headers.get("retry-after");
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  const seconds = retryValue
    ? Number(retryValue)
    : reset
      ? reset - Math.floor(Date.now() / 1000)
      : 60;
  const retryAfter = Math.max(
    1,
    Math.min(86_400, Number.isFinite(seconds) ? Math.ceil(seconds) : 60),
  );
  if (
    response.status === 429 ||
    (!response.ok &&
      (response.headers.get("x-ratelimit-remaining") === "0" ||
        response.headers.has("retry-after")))
  )
    throw new PublicError(
      "GitHub's request budget is resting. Try again after the quota resets.",
      429,
      retryAfter,
    );
  if (response.status === 401 || response.status === 403)
    throw new PublicError(
      "GitHub access is unavailable. The operator should check the deployment credential.",
      503,
    );
  if (!response.ok)
    throw new PublicError(
      "GitHub is unavailable right now. Try again later.",
      503,
    );
  let payload: Record<string, unknown>;
  try {
    payload = record(await response.json());
  } catch {
    throw new PublicError("GitHub returned an unreadable response.", 503);
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    let errors: Record<string, unknown>[];
    try {
      errors = payload.errors.map(record);
    } catch {
      throw new PublicError(
        "GitHub returned an unreadable error response.",
        503,
      );
    }
    if (errors.some((error) => error.type === "RATE_LIMITED"))
      throw new PublicError(
        "GitHub's request budget is resting. Try again later.",
        429,
        retryAfter,
      );
    if (errors.every((error) => error.type === "NOT_FOUND"))
      throw new PublicError(
        "That GitHub user wasn't found. Check the spelling and try again.",
        404,
      );
    throw new PublicError(
      "GitHub couldn't return this profile. Try again later.",
      503,
    );
  }
  const data = payload.data;
  if (data && record(data).user === null)
    throw new PublicError(
      "That GitHub user wasn't found. Check the spelling and try again.",
      404,
    );
  return normalizeProfile(data, new Date().toISOString());
}
