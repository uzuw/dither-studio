import test from "node:test";
import assert from "node:assert/strict";
import { matchingPreset, presets } from "../lib/presets";
import {
  CARD_TYPES,
  cardRecipe,
  cards,
  cardParams,
  cardEditorPath,
  parseCardOptions,
} from "../lib/cards";
import { decodeRecipe, encodeRecipe, parseRecipe } from "../lib/recipe";
import { renderCard } from "../lib/card";
import { sampleProfile } from "../lib/demo";

test("every preset preserves card content and survives the existing image URL contract", () => {
  const profile = sampleProfile();
  for (const type of CARD_TYPES) {
    const original = {
      ...cardRecipe(type),
      title: "My print",
      tagline: "Keep this footer",
      chartStyle: "bars" as const,
      groupBy: "month" as const,
      repoCount: 5,
    };
    for (const preset of presets) {
      const recipe = parseRecipe({ ...original, ...preset.design });
      assert.equal(matchingPreset(recipe)?.id, preset.id);
      assert.equal(recipe.title, original.title);
      assert.equal(recipe.tagline, original.tagline);
      assert.deepEqual(recipe.metrics, original.metrics);
      assert.equal(recipe.chartStyle, original.chartStyle);
      assert.equal(recipe.groupBy, original.groupBy);
      assert.equal(recipe.repoCount, original.repoCount);
      const options = parseCardOptions(
        type,
        cardParams({ layout: cards[type].layout, theme: preset.theme, recipe }),
      );
      assert.deepEqual(options.recipe, recipe);
      assert.deepEqual(decodeRecipe(encodeRecipe(recipe)), recipe);
      const svg = renderCard(profile, options);
      assert.ok(Buffer.byteLength(svg) < 100_000);
      assert.ok(svg.includes(preset.design.palette.background));
      assert.doesNotMatch(svg, /foreignObject|<script|<image/);
      const editor = new URL(cardEditorPath(type, "", {
        layout: cards[type].layout,
        theme: preset.theme,
        recipe: cardRecipe(type, preset.theme, recipe),
      }), "https://example.com");
      const restored = parseCardOptions(type, editor.searchParams);
      assert.equal(restored.theme, preset.theme);
      assert.equal(matchingPreset(restored.recipe!)?.id, preset.id);
    }
  }
});

test("preset selection reflects actual styling after customization and recipe restoration", () => {
  const recipe = parseRecipe({ ...cardRecipe("stars"), ...presets[2].design });
  assert.equal(
    matchingPreset(decodeRecipe(encodeRecipe(recipe)))?.id,
    "blueprint",
  );
  assert.equal(
    matchingPreset({ ...recipe, title: "Different title" })?.id,
    "blueprint",
  );
  assert.equal(matchingPreset({ ...recipe, radius: 7 }), undefined);
  assert.equal(matchingPreset({ ...recipe, pattern: "dots" }), undefined);
  assert.equal(matchingPreset({ ...recipe, font: "serif" }), undefined);
  assert.equal(
    matchingPreset({
      ...recipe,
      palette: { ...recipe.palette, background: "#FFFFFF" },
    }),
    undefined,
  );
});

test("preset text and ink have readable contrast against their background", () => {
  function luminance(hex: string) {
    const channels = hex.slice(1).match(/../g)!.map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const { name, design } of presets) {
    const background = luminance(design.palette.background);
    for (const key of ["foreground", "muted", "accent"] as const) {
      const foreground = luminance(design.palette[key]);
      const contrast =
        (Math.max(background, foreground) + 0.05) /
        (Math.min(background, foreground) + 0.05);
      assert.ok(contrast >= 4.5, `${name} ${key}: ${contrast.toFixed(2)}`);
    }
  }
});
