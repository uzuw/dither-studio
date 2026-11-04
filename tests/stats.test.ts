import test from "node:test";
import assert from "node:assert/strict";
import {
  activityInsights,
  activitySeries,
  calculateStats,
  previousDay,
} from "../lib/stats";
import { day } from "./fixtures";

test("empty calendars have zero stats", () => {
  assert.deepEqual(calculateStats([], "2026-11-03"), {
    activeDays: 0,
    currentStreak: 0,
    longestStreak: 0,
  });
});
test("today and yesterday grace, gaps, sorting, and zero days", () => {
  const days = [
    day("2026-11-03"),
    day("2026-10-30"),
    day("2026-10-31"),
    day("2026-11-01", 0),
    day("2026-11-02"),
  ];
  assert.deepEqual(calculateStats(days, "2026-11-03"), {
    activeDays: 4,
    currentStreak: 2,
    longestStreak: 2,
  });
  assert.equal(calculateStats(days, "2026-11-04").currentStreak, 2);
  assert.equal(calculateStats(days, "2026-11-05").currentStreak, 0);
});
test("leap and year boundaries use UTC; future days don't count", () => {
  assert.equal(previousDay("2024-03-01"), "2024-02-29");
  assert.equal(previousDay("2026-01-01"), "2025-12-31");
  assert.deepEqual(
    calculateStats(
      [
        day("2024-02-28"),
        day("2024-02-29"),
        day("2024-03-01"),
        day("2024-03-02"),
      ],
      "2024-03-01",
    ),
    { activeDays: 3, currentStreak: 3, longestStreak: 3 },
  );
});
test("streaks stay bounded by the provided period and cannot bridge missing dates", () => {
  assert.deepEqual(calculateStats([day("2026-11-03")], "2026-11-03"), {
    activeDays: 1,
    currentStreak: 1,
    longestStreak: 1,
  });
  assert.equal(
    calculateStats(
      [day("2026-10-31"), day("2026-11-02"), day("2026-11-03")],
      "2026-11-03",
    ).longestStreak,
    2,
  );
});

test("activity series preserve totals across UTC weeks, leap days, and partial months", () => {
  const days = [
    day("2024-03-03", 4),
    day("2024-02-29", 2),
    day("2024-03-01", 3),
  ];
  assert.deepEqual(activitySeries(days, "month"), [
    { label: "2024-02", count: 2, days: 1 },
    { label: "2024-03", count: 7, days: 2 },
  ]);
  assert.deepEqual(activitySeries(days, "week"), [
    { label: "2024-02-25", count: 5, days: 2 },
    { label: "2024-03-03", count: 4, days: 1 },
  ]);
  assert.deepEqual(activitySeries([], "day"), []);
  assert.equal(activitySeries(days, "day")[0].label, "2024-02-29");
});

test("rhythm uses observed-day denominators, distributions include zero, and missing dates break runs", () => {
  const days = [
    day("2024-02-28", 0),
    day("2024-02-29", 4),
    day("2024-03-01", 10),
    day("2024-03-03", 20),
    day("2024-03-07", 6),
  ];
  const insights = activityInsights(days);
  assert.deepEqual(insights.weekdays[4], {
    label: "Thu",
    count: 10,
    days: 2,
    active: 2,
  });
  assert.deepEqual(
    insights.distribution.map((p) => p.count),
    [1, 1, 1, 1, 1],
  );
  assert.deepEqual(insights.streaks, [
    { label: "1", count: 2 },
    { label: "2", count: 1 },
  ]);
  assert.deepEqual(activityInsights([]).streaks, []);
  assert.deepEqual(activityInsights([day("2024-02-28", 0)]).streaks, []);
});
