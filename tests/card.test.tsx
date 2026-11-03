import test from "node:test";
import assert from "node:assert/strict";
import {
  BAYER,
  filledPositions,
  renderCard,
  renderError,
  renderLink,
} from "../lib/card";
import { sampleProfile } from "../lib/demo";
import { defaultRecipe, LAYOUTS, PATTERNS, THEMES } from "../lib/recipe";

test("dither levels are monotonic, deterministic, and have exact densities", () => {
  assert.equal(new Set(BAYER).size, 16);
  for (let level = 0; level <= 4; level++) {
    const filled = filledPositions(level);
    assert.equal(filled.length, level * 4);
    if (level)
      assert.ok(
        filledPositions(level - 1).every((position) =>
          filled.includes(position),
        ),
      );
  }
});
test("all layouts, palettes, and textures are deterministic self-contained accessible SVG under 100 KB", () => {
  const profile = sampleProfile();
  profile.username = "a".repeat(39);
  for (const layout of LAYOUTS)
    for (const theme of THEMES)
      for (const pattern of PATTERNS) {
        const recipe = { ...defaultRecipe(theme), pattern };
        const svg = renderCard(profile, { layout, theme, recipe });
        assert.equal(svg, renderCard(profile, { layout, theme, recipe }));
        assert.ok(Buffer.byteLength(svg) < 100_000);
        assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
        assert.match(svg, /<title id="title">/);
        assert.match(svg, /<desc id="desc">/);
        assert.doesNotMatch(
          svg,
          /<script|foreignObject|<image|@import|@font-face|https:\/\//i,
        );
      }
});
test("text is XML-escaped in cards, social panels, and error states", () => {
  const recipe = {
    ...defaultRecipe(),
    title: '<script>alert("hi")</script>',
    subtitle: "a & b",
  };
  for (const layout of LAYOUTS) {
    const svg = renderCard(sampleProfile(), { layout, theme: "paper", recipe });
    assert.doesNotMatch(svg, /<script>/);
    assert.match(svg, /&lt;script&gt;/);
  }
  assert.match(renderLink("x & y <z>", recipe), /x &amp; y &lt;z&gt;/);
  assert.match(renderError("<bad> & error"), /&lt;bad&gt; &amp; error/);
});
test("calendar cell count follows dates, not an assumed number of full weeks", () => {
  const profile = sampleProfile();
  const svg = renderCard(profile, { layout: "calendar", theme: "paper" });
  assert.equal(
    (svg.match(/<title>\d{4}-\d{2}-\d{2}:/g) ?? []).length,
    profile.weeks.flat().length,
  );
  assert.match(
    renderCard(profile, { layout: "calendar", theme: "paper" }, true),
    /Sample artwork/,
  );
});

test("profile wrapping preserves Unicode characters across line boundaries", () => {
  const recipe = { ...defaultRecipe(), title: "A" + "💙".repeat(30) };
  const svg = renderCard(sampleProfile(), {
    layout: "profile",
    theme: "paper",
    recipe,
  });
  assert.equal(Buffer.from(svg).toString("utf8"), svg);
  assert.equal((svg.match(/💙/gu) ?? []).length, 30);
});
