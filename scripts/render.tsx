import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { renderCard, renderLink } from "../lib/card";
import { sampleProfile } from "../lib/demo";
import { normalizeProfile, requestProfile } from "../lib/github-client";
import {
  defaultRecipe,
  LAYOUTS,
  normalizeUsername,
  parseRecipe,
  record,
} from "../lib/recipe";
import { LEVELS, type Profile } from "../lib/types";

async function main() {
  const { values } = parseArgs({
    options: {
      username: { type: "string" },
      recipe: { type: "string" },
      out: { type: "string", default: "output/profile" },
      data: { type: "string" },
      sample: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Dither renderer\n\nnpm run render -- --username NAME [--recipe FILE] [--out DIRECTORY]\nnpm run render -- --sample [--recipe FILE] [--out DIRECTORY]\nnpm run render -- --data PROFILE_JSON [--recipe FILE] [--out DIRECTORY]\n\nLive data uses GITHUB_TOKEN. --force replaces only generated target files.\nRecipes never contain credentials. Sample artwork is visibly labeled.",
    );
    return;
  }
  if (
    [!!values.username, !!values.data, values.sample].filter(Boolean).length !==
    1
  )
    throw new Error(
      "Choose exactly one data source: --username NAME, --data FILE, or --sample.",
    );
  const recipe = values.recipe
    ? parseRecipe(JSON.parse(await readFile(values.recipe, "utf8")))
    : defaultRecipe();
  let profile: Profile;
  if (values.sample) profile = sampleProfile();
  else if (values.data) {
    const data = record(JSON.parse(await readFile(values.data, "utf8")));
    if (
      !Array.isArray(data.weeks) ||
      typeof data.fetchedAt !== "string" ||
      Number.isNaN(Date.parse(data.fetchedAt))
    )
      throw new Error("Use profile JSON returned by /api/profile/USERNAME.");
    profile = normalizeProfile(
      {
        user: {
          login: data.username,
          contributionsCollection: {
            startedAt: data.start,
            endedAt: data.end,
            contributionCalendar: {
              totalContributions: data.total,
              weeks: data.weeks.map((week) => {
                if (!Array.isArray(week))
                  throw new Error("Invalid profile week.");
                return {
                  contributionDays: week.map((value) => {
                    const day = record(value);
                    return {
                      date: day.date,
                      weekday: day.weekday,
                      contributionCount: day.count,
                      contributionLevel: LEVELS[day.level as number],
                    };
                  }),
                };
              }),
            },
          },
        },
      },
      data.fetchedAt,
    );
    if (data.source === "sample") profile.source = "sample";
  } else
    profile = await requestProfile(
      normalizeUsername(values.username!),
      process.env.GITHUB_TOKEN,
    );

  const output = path.resolve(values.out!);
  const files: [string, string][] = LAYOUTS.map((layout) => [
    `${layout}.svg`,
    renderCard(profile, { layout, theme: "paper", recipe }, values.sample),
  ]);
  recipe.links.forEach((link, i) =>
    files.push([`link-${i + 1}.svg`, renderLink(link.label, recipe)]),
  );
  const socialPanels = recipe.links.length
    ? `<p>${recipe.links.map((link, i) => `<a href="${escapeAttribute(link.url)}"><img src="./link-${i + 1}.svg" width="${Math.floor(100 / recipe.links.length)}%" alt="${escapeAttribute(link.label)}"></a>`).join("")}</p>\n`
    : "";
  const markdown = `${profile.source === "sample" ? "> **Sample artwork — example data, not a real GitHub account's activity.**\n\n" : ""}[![${profile.username}'s profile](./profile.svg)](https://github.com/${profile.username})\n\n${socialPanels}\n![${profile.username}'s contribution graph](./calendar.svg)\n\n![${profile.username}'s GitHub stats](./stats.svg)\n\n<!-- Generated with Dither. Activity covers ${profile.start.slice(0, 10)} through ${profile.end.slice(0, 10)} (UTC). -->\n`;
  files.push(
    ["README.md", markdown],
    ["dither.recipe.json", JSON.stringify(recipe, null, 2) + "\n"],
    ["profile-data.json", JSON.stringify(profile, null, 2) + "\n"],
  );
  await mkdir(output, { recursive: true });
  if (!values.force)
    for (const [filename] of files) {
      let exists = false;
      try {
        await access(path.join(output, filename));
        exists = true;
      } catch {
        /* Missing files are safe to create. */
      }
      if (exists)
        throw new Error(
          `${filename} already exists. Choose a new output directory or explicitly use --force.`,
        );
    }
  for (const [filename, content] of files)
    await writeFile(path.join(output, filename), content, {
      flag: values.force ? "w" : "wx",
    });
  console.log(
    `Rendered ${files.length} files to ${output}${profile.source === "sample" ? " (labeled sample)" : ` for @${profile.username}`}.`,
  );
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Could not render the profile.",
  );
  process.exitCode = 1;
});
