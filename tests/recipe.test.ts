import test from "node:test";
import assert from "node:assert/strict";
import {
  cardPath,
  decodeRecipe,
  defaultRecipe,
  encodeRecipe,
  normalizeUsername,
  parseOptions,
  parseRecipe,
} from "../lib/recipe";

test("username validation blocks URLs, bad hyphens, injection, and overlong names", () => {
  assert.equal(normalizeUsername(" UzuW "), "uzuw");
  assert.equal(normalizeUsername("a-b"), "a-b");
  for (const name of [
    "",
    "-abc",
    "abc-",
    "a--b",
    "a_b",
    "@uzuw",
    "https://github.com/uzuw",
    "../api",
    "<svg>",
    "a".repeat(40),
  ])
    assert.throws(() => normalizeUsername(name));
});
test("recipe validates trust boundaries, sizes, and external link protocols", () => {
  for (const bad of [
    { palette: { accent: "url(https://evil)" } },
    { font: "evil-font" },
    { radius: 25 },
    { radius: 1.5 },
    { title: "x".repeat(65) },
    { subtitle: "bad\nline" },
    { unknown: true },
    { version: 2 },
    { metrics: [] },
    { metrics: ["stars", "stars"] },
    { metrics: ["privateRepos"] },
    { chartStyle: "javascript" },
    { groupBy: "hour" },
    { repoCount: 6 },
    { repoCount: 1.5 },
    { links: [{ label: "bad", url: "javascript:alert(1)" }] },
    { links: [{ label: "bad", url: "https://user:password@example.com" }] },
    { links: Array(5).fill({ label: "x", url: "https://example.com" }) },
  ])
    assert.throws(() => parseRecipe(bad));
  const good = parseRecipe({
    palette: { accent: "#abcdef" },
    title: "你好, GitHub",
    links: [{ label: "Website", url: "https://example.com" }],
  });
  assert.equal(good.palette.accent, "#ABCDEF");
  assert.deepEqual(decodeRecipe(encodeRecipe(good)), good);
});
test("bounded Unicode recipes and invalid encodings", () => {
  for (const bad of ["!invalid", "A".repeat(3201), "a", "e30$"])
    assert.throws(() => decodeRecipe(bad));
  assert.equal(decodeRecipe(encodeRecipe(defaultRecipe())).version, 1);
  const large = parseRecipe({
    title: "💙".repeat(64),
    subtitle: "💙".repeat(140),
    tagline: "💙".repeat(64),
    links: Array.from({ length: 4 }, () => ({
      label: "💙".repeat(24),
      url: "https://example.com/" + "a".repeat(140),
    })),
  });
  assert.throws(() => encodeRecipe(large), /too large/);
});
test("canonical options reject duplicate/unknown knobs and normalize defaults", () => {
  assert.throws(() =>
    parseOptions(new URLSearchParams("layout=stats&layout=profile")),
  );
  assert.throws(() => parseOptions(new URLSearchParams("cache_bust=1")));
  assert.throws(() => parseOptions(new URLSearchParams("theme=bad")));
  assert.throws(() => parseOptions(new URLSearchParams("recipe=")));
  assert.equal(
    cardPath(
      "UZUW",
      parseOptions(new URLSearchParams("theme=paper&layout=calendar")),
    ),
    "/api/card/uzuw",
  );
  assert.equal(
    cardPath(
      "uzuw",
      parseOptions(new URLSearchParams("theme=midnight&layout=stats")),
    ),
    "/api/card/uzuw?layout=stats&theme=midnight",
  );
});

test("metric order and chart composition survive portable URL encoding", () => {
  const recipe = parseRecipe({
    metrics: ["stars", "pullRequests"],
    chartStyle: "bars",
    groupBy: "month",
    repoCount: 5,
  });
  const options = parseOptions(
    new URLSearchParams(
      cardPath("uzuw", { layout: "overview", theme: "paper", recipe }).split(
        "?",
      )[1],
    ),
  );
  assert.deepEqual(options.recipe?.metrics, ["stars", "pullRequests"]);
  assert.equal(options.recipe?.groupBy, "month");
  assert.equal(options.layout, "overview");
});
