import test from "node:test";
import assert from "node:assert/strict";
import { calculateStats, previousDay } from "../lib/stats";
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
