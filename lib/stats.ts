import type { Day, Profile } from "./types";

const DAY_MS = 86_400_000;
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function previousDay(date: string) {
  return dateKey(new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS));
}

export function calculateStats(days: Day[], today: string): Profile["stats"] {
  const active = new Set(
    days
      .filter((day) => day.count > 0 && day.date <= today)
      .map((day) => day.date),
  );
  let longestStreak = 0,
    run = 0,
    last = "";
  for (const day of [...active].sort()) {
    run = last === previousDay(day) ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    last = day;
  }
  let cursor = active.has(today) ? today : previousDay(today);
  let currentStreak = 0;
  while (active.has(cursor)) {
    currentStreak++;
    cursor = previousDay(cursor);
  }
  return { activeDays: active.size, currentStreak, longestStreak };
}

export type ActivityPoint = { label: string; count: number; days: number };

// Missing dates remain missing; partial buckets count only observed days.
export function activitySeries(
  days: Day[],
  group: "day" | "week" | "month",
): ActivityPoint[] {
  const buckets = new Map<string, ActivityPoint>();
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const label =
      group === "month"
        ? day.date.slice(0, 7)
        : group === "week"
          ? dateKey(
              new Date(
                Date.parse(`${day.date}T00:00:00Z`) - day.weekday * DAY_MS,
              ),
            )
          : day.date;
    const point = buckets.get(label) ?? { label, count: 0, days: 0 };
    point.count += day.count;
    point.days++;
    buckets.set(label, point);
  }
  return [...buckets.values()];
}

export function activityInsights(days: Day[]) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
    (label) => ({ label, count: 0, days: 0, active: 0 }),
  );
  const distribution = ["0", "1–4", "5–9", "10–19", "20+"].map((label) => ({
    label,
    count: 0,
  }));
  const runs = new Map<number, number>();
  let run = 0,
    last = "";
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const weekday = weekdays[day.weekday];
    weekday.count += day.count;
    weekday.days++;
    if (day.count > 0) weekday.active++;
    distribution[
      day.count === 0
        ? 0
        : day.count < 5
          ? 1
          : day.count < 10
            ? 2
            : day.count < 20
              ? 3
              : 4
    ].count++;
    if (!day.count || (last && previousDay(day.date) !== last)) {
      if (run) runs.set(run, (runs.get(run) ?? 0) + 1);
      run = 0;
    }
    if (day.count > 0) run++;
    last = day.date;
  }
  if (run) runs.set(run, (runs.get(run) ?? 0) + 1);
  return {
    weekdays,
    distribution,
    streaks: [...runs]
      .sort(([a], [b]) => a - b)
      .map(([length, count]) => ({ label: `${length}`, count })),
  };
}
