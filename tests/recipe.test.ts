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
