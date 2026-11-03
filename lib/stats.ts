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
