import test from "node:test";
import assert from "node:assert/strict";
import rule from "../examples/firewall-api-observe.json";

function matches(path: string, method: string) {
  return rule.conditionGroup.some((group) =>
    group.conditions.every((condition) => {
      const value = condition.type === "method" ? method : path;
      return condition.op === "eq"
        ? value === condition.value
        : value.startsWith(condition.value);
    }),
  );
}

test("firewall observation covers GitHub-backed GET routes and preserves other traffic", () => {
  for (const path of [
    "/api/profile/uzuw",
    "/api/card/uzuw",
    "/api/card/uzuw/stars",
  ])
    assert.equal(matches(path, "GET"), true, path);
  for (const path of [
    "/",
    "/cards/stars",
    "/api/sample/stars",
    "/api/cardinal",
    "/skill",
  ])
    assert.equal(matches(path, "GET"), false, path);
  assert.equal(matches("/api/card/uzuw/stars", "POST"), false);
  assert.equal(matches("/api/profile/uzuw", "OPTIONS"), false);
});

test("observation rule counts by IP and never blocks or challenges on threshold crossings", () => {
  assert.equal(rule.action.mitigate.action, "rate_limit");
  const limit = rule.action.mitigate.rateLimit;
  assert.equal(limit.action, "log");
  assert.equal(limit.algo, "fixed_window");
  assert.equal(limit.window, 60);
  assert.equal(limit.limit, 300);
  assert.deepEqual(limit.keys, ["ip"]);
  for (const group of rule.conditionGroup)
    assert.deepEqual(
      group.conditions.map((condition) => [condition.type, condition.op]),
      [
        ["method", "eq"],
        ["path", "pre"],
      ],
    );
});
