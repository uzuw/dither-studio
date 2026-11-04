import { calculateStats, dateKey } from "./stats";
import { normalizeUsername, record } from "./recipe";
import { LEVELS, PublicError, type Day, type Profile } from "./types";

export const GITHUB_QUERY = `query DitherProfile($login: String!) {
  user(login: $login) {
    login
    repositories(first: 100, privacy: PUBLIC, ownerAffiliations: [OWNER], orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount pageInfo { hasNextPage endCursor }
      nodes { name description stargazerCount forkCount isPrivate owner { login } }
    }
    contributionsCollection {
      startedAt endedAt
      totalPullRequestContributions totalPullRequestReviewContributions
      totalIssueContributions totalCommitContributions
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
      activity: null,
      repositories: null,
      stats: calculateStats(days, dateKey(new Date(fetchedAt))),
    };
  } catch {
    throw new PublicError(
      "GitHub returned incomplete data. Try again later.",
      503,
    );
  }
}

async function requestGraphql(
  query: string,
  variables: Record<string, string>,
  token: string | undefined,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
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
      body: JSON.stringify({ query, variables }),
      signal,
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
  let data: Record<string, unknown>;
  try {
    data = record(payload.data);
  } catch {
    throw new PublicError(
      "GitHub returned incomplete data. Try again later.",
      503,
    );
  }
  if (data.user === null)
    throw new PublicError(
      "That GitHub user wasn't found. Check the spelling and try again.",
      404,
    );
  return data;
}

// Shared validation also keeps imported CLI snapshots from introducing unsafe values.
export function normalizeMetrics(
  input: unknown,
): Pick<Profile, "activity" | "repositories"> {
  try {
    const data = record(input),
      activity = record(data.activity),
      repos = record(data.repositories);
    if (!Array.isArray(repos.top) || repos.top.length > 5) throw new Error();
    const top = repos.top.map((value) => {
      const repo = record(value);
      if (
        typeof repo.name !== "string" ||
        !/^[\w.-]{1,100}$/.test(repo.name) ||
        typeof repo.description !== "string" ||
        [...repo.description].length > 100 ||
        /[\u0000-\u001f\u007f]/.test(repo.description)
      )
        throw new Error();
      return {
        name: repo.name,
        description: repo.description,
        stars: count(repo.stars),
        forks: count(repo.forks),
      };
    });
    const totalCount = count(repos.totalCount),
      stars = count(repos.stars);
    if (
      top.length !== Math.min(5, totalCount) ||
      new Set(top.map((r) => r.name)).size !== top.length ||
      top.reduce((sum, r) => sum + r.stars, 0) > stars
    )
      throw new Error();
    return {
      activity: {
        pullRequests: count(activity.pullRequests),
        reviews: count(activity.reviews),
        issues: count(activity.issues),
        commits: count(activity.commits),
      },
      repositories: { totalCount, stars, top },
    };
  } catch {
    throw new PublicError(
      "GitHub returned incomplete profile statistics. Try again later.",
      503,
    );
  }
}

const REPOSITORIES_QUERY = `query DitherRepositories($login: String!, $after: String!) {
  user(login: $login) {
    repositories(first: 100, after: $after, privacy: PUBLIC, ownerAffiliations: [OWNER], orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount pageInfo { hasNextPage endCursor }
      nodes { name description stargazerCount forkCount isPrivate owner { login } }
    }
  }
}`;

export async function requestProfile(
  username: string,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<Profile> {
  const login = normalizeUsername(username),
    signal = AbortSignal.timeout(20_000);
  const data = await requestGraphql(
    GITHUB_QUERY,
    { login },
    token,
    fetcher,
    signal,
  );
  const fetchedAt = new Date().toISOString();
  const profile = normalizeProfile(data, fetchedAt);
  const user = record(data.user),
    collection = record(user.contributionsCollection);
  let connection: Record<string, unknown>;
  try {
    connection = record(user.repositories);
  } catch {
    throw new PublicError(
      "GitHub returned incomplete repository statistics.",
      503,
    );
  }
  const repositories: NonNullable<Profile["repositories"]>["top"] = [];
  const cursors = new Set<string>(),
    names = new Set<string>();
  let totalCount: number;
  try {
    totalCount = count(connection.totalCount);
  } catch {
    throw new PublicError(
      "GitHub returned incomplete repository statistics.",
      503,
    );
  }
  for (;;) {
    let nextCursor: string | null = null;
    try {
      if (
        count(connection.totalCount) !== totalCount ||
        !Array.isArray(connection.nodes) ||
        connection.nodes.length > 100
      )
        throw new Error();
      for (const value of connection.nodes) {
        const repo = record(value);
        if (
          repo.isPrivate !== false ||
          normalizeUsername(String(record(repo.owner).login)) !==
            profile.username ||
          typeof repo.name !== "string" ||
          !/^[\w.-]{1,100}$/.test(repo.name) ||
          names.has(repo.name) ||
          !(repo.description === null || typeof repo.description === "string")
        )
          throw new Error();
        names.add(repo.name);
        repositories.push({
          name: repo.name,
          description: [
            ...String(repo.description ?? "").replace(
              /[\u0000-\u001f\u007f]/g,
              " ",
            ),
          ]
            .slice(0, 100)
            .join(""),
          stars: count(repo.stargazerCount),
          forks: count(repo.forkCount),
        });
      }
      const info = record(connection.pageInfo);
      if (
        typeof info.hasNextPage !== "boolean" ||
        repositories.length > totalCount
      )
        throw new Error();
      if (info.hasNextPage) {
        if (
          !connection.nodes.length ||
          typeof info.endCursor !== "string" ||
          !info.endCursor ||
          cursors.has(info.endCursor)
        )
          throw new Error();
        nextCursor = info.endCursor;
        cursors.add(nextCursor);
      } else if (repositories.length !== totalCount) throw new Error();
    } catch {
      throw new PublicError(
        "GitHub returned incomplete repository statistics. Try again later.",
        503,
      );
    }
    if (!nextCursor) break;
    const page = await requestGraphql(
      REPOSITORIES_QUERY,
      { login, after: nextCursor },
      token,
      fetcher,
      signal,
    );
    try {
      connection = record(record(page.user).repositories);
    } catch {
      throw new PublicError(
        "GitHub returned incomplete repository statistics.",
        503,
      );
    }
  }
  repositories.sort(
    (a, b) => b.stars - a.stars || a.name.localeCompare(b.name, "en"),
  );
  return {
    ...profile,
    ...normalizeMetrics({
      activity: {
        pullRequests: collection.totalPullRequestContributions,
        reviews: collection.totalPullRequestReviewContributions,
        issues: collection.totalIssueContributions,
        commits: collection.totalCommitContributions,
      },
      repositories: {
        totalCount,
        stars: repositories.reduce((sum, r) => sum + r.stars, 0),
        top: repositories.slice(0, 5),
      },
    }),
  };
}
