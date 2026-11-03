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
      contributionsCollection: {
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
