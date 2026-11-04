import type { Day, Profile } from "./types";
import { calculateStats, dateKey } from "./stats";

// A fixed, visibly labeled specimen; never used as fallback for a live lookup.
export function sampleProfile(): Profile {
  const start = new Date("2025-11-03T00:00:00Z"),
    end = "2026-11-03";
  const weeks: Day[][] = [];
  let week: Day[] = [];
  for (let i = 0; i < 366; i++) {
    const day = new Date(start.getTime() + i * 86_400_000),
      weekday = day.getUTCDay();
    if (weekday === 0 && week.length) {
      weeks.push(week);
      week = [];
    }
    const level =
      (i * 17 + Math.floor(i / 7) * 11) % 13 < 4
        ? 0
        : ((i * 7 + Math.floor(i / 28)) % 4) + 1;
    week.push({
      date: dateKey(day),
      weekday,
      level,
      count: level ? level * 3 + (i % 5) : 0,
    });
  }
  weeks.push(week);
  return {
    source: "sample",
    username: "octocat",
    start: start.toISOString(),
    end: `${end}T23:59:59Z`,
    fetchedAt: `${end}T12:00:00Z`,
    weeks,
    activity: { pullRequests: 84, reviews: 126, issues: 32, commits: 1248 },
    repositories: {
      totalCount: 18,
      stars: 2640,
      top: [
        {
          name: "dither-studio",
          description: "A print studio for your GitHub story.",
          stars: 1240,
          forks: 86,
        },
        {
          name: "small-hours",
          description: "Tools for the things you build after hours.",
          stars: 640,
          forks: 42,
        },
        {
          name: "paper-trail",
          description: "A place for ideas to take shape.",
          stars: 412,
          forks: 29,
        },
        {
          name: "dot-matrix",
          description: "Experiments in generative print.",
          stars: 208,
          forks: 12,
        },
        {
          name: "field-notes",
          description: "Notes from the work in progress.",
          stars: 82,
          forks: 6,
        },
      ],
    },
    total: weeks.flat().reduce((sum, day) => sum + day.count, 0),
    stats: calculateStats(weeks.flat(), end),
  };
}
