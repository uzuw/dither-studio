import test from "node:test";
import assert from "node:assert/strict";
import {
  CARD_TYPES,
  cards,
  cardRecipe,
  cardImagePath,
  cardEditorPath,
  parseCardType,
  parseCardOptions,
  resolvedCardOptions,
  sampleImagePath,
} from "../lib/cards";
import { encodeRecipe } from "../lib/recipe";
import { renderCard } from "../lib/card";
import { sampleProfile } from "../lib/demo";

test("each public card has a distinct editor, SVG, and sample route with canonical options", () => {
  for (const type of CARD_TYPES) {
    const options = parseCardOptions(type, new URLSearchParams("theme=paper"));
    assert.equal(
      cardImagePath("OCTOCAT", type, options),
      `/api/card/octocat/${type}`,
    );
    assert.equal(sampleImagePath(type, options), `/api/sample/${type}`);
    assert.equal(
      cardEditorPath(type, "OCTOCAT", options),
      `/cards/${type}?username=octocat`,
    );
    assert.equal(options.layout, cards[type].layout);
    const svg = renderCard(sampleProfile(), resolvedCardOptions(type, options));
    assert.ok(Buffer.byteLength(svg) < 100_000);
    assert.match(svg, /Sample artwork/);
  }
});

test("PR, stars, and streak cards contain only the appropriate metrics", () => {
  const profile = sampleProfile();
  const render = (type: "pull-requests" | "stars" | "streaks") =>
    renderCard(
      profile,
      resolvedCardOptions(type, { layout: "stats", theme: "paper" }),
    );
  assert.match(render("pull-requests"), /PRs opened/);
  assert.match(render("pull-requests"), /PR reviews/);
  assert.doesNotMatch(
    render("pull-requests"),
    /Stars received|Current streak|Top repositories/,
  );
  assert.match(render("stars"), /Stars received/);
  assert.doesNotMatch(
    render("stars"),
    /PRs opened|Current streak|Contribution curve/,
  );
  assert.match(render("streaks"), /Current streak/);
  assert.doesNotMatch(render("streaks"), /PRs opened|Stars received/);
  assert.deepEqual(cardRecipe("stats").metrics, [
    "contributions",
    "commits",
    "activeDays",
  ]);
});

test("typed routes reject invalid card types, option injection and metrics from another card", () => {
  assert.throws(() => parseCardType("overview"));
  assert.throws(() =>
    parseCardOptions("stars", new URLSearchParams("layout=profile")),
  );
  assert.throws(() =>
    parseCardOptions(
      "stars",
      new URLSearchParams("theme=paper&theme=midnight"),
    ),
  );
  assert.throws(() =>
    parseCardOptions("stars", new URLSearchParams("cache_bust=1")),
  );
  assert.throws(() =>
    parseCardOptions(
      "stars",
      new URLSearchParams({
        recipe: encodeRecipe(cardRecipe("pull-requests")),
      }),
    ),
  );
  const recipe = {
    ...cardRecipe("stars", "midnight"),
    metrics: ["stars"] as const,
  };
  const options = parseCardOptions(
    "stars",
    new URLSearchParams({
      recipe: encodeRecipe({ ...recipe, metrics: [...recipe.metrics] }),
    }),
  );
  assert.deepEqual(options.recipe?.metrics, ["stars"]);
  assert.equal(
    new URL(
      cardImagePath("octocat", "stars", options),
      "https://example.com",
    ).searchParams.get("layout"),
    null,
  );
});
