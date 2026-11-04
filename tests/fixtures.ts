import { LEVELS, type Day } from "../lib/types";

export function day(date: string, count = 1, level = count ? 1 : 0): Day {
  return {
    date,
    count,
    level,
    weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
  };
}
export function githubPayload(
  days = [day("2026-11-02", 2, 1), day("2026-11-03", 3, 2)],
) {
  return {
    user: {
      login: "octocat",
      repositories: {
        totalCount: 0,
        nodes: [] as {
          name: string;
          description: string | null;
          stargazerCount: number;
          forkCount: number;
          isPrivate: boolean;
          owner: { login: string };
        }[],
        pageInfo: { hasNextPage: false, endCursor: null as string | null },
      },
      contributionsCollection: {
        totalPullRequestContributions: 3,
        totalPullRequestReviewContributions: 2,
        totalIssueContributions: 1,
        totalCommitContributions: 4,
        startedAt: `${days[0]?.date ?? "2026-11-02"}T00:00:00Z`,
        endedAt: "2026-11-03T23:59:59Z",
        contributionCalendar: {
          totalContributions: days.reduce((sum, d) => sum + d.count, 0),
          weeks: [
            {
              contributionDays: days.map((d) => ({
                date: d.date,
                weekday: d.weekday,
                contributionCount: d.count,
                contributionLevel: LEVELS[d.level],
              })),
            },
          ],
        },
      },
    },
  };
}
