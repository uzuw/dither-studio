import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("CLI produces usable linked artwork, round-trips snapshots, and protects existing files", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "dither-cli-"));
  const out = path.join(temp, "sample"),
    roundTrip = path.join(temp, "round-trip");
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/render.tsx", ...args],
      { encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: "" } },
    );
  try {
    const render = run(
      "--sample",
      "--recipe",
      "examples/blueprint.json",
      "--out",
      out,
    );
    assert.equal(render.status, 0, render.stderr);
    const markdown = await readFile(path.join(out, "README.md"), "utf8");
    assert.match(markdown, /Sample artwork/);
    assert.match(markdown, /href="https:\/\/github.com\/uzuw"/);
    for (const [, target] of markdown.matchAll(/(?:src="|\]\()(\.\/[^"\)]+)/g))
      await readFile(path.resolve(out, target));
    const original = await readFile(path.join(out, "calendar.svg"), "utf8");
    const duplicate = run("--sample", "--out", out);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /already exists/);
    assert.equal(
      await readFile(path.join(out, "calendar.svg"), "utf8"),
      original,
    );
    const snapshot = run(
      "--data",
      path.join(out, "profile-data.json"),
      "--recipe",
      "examples/blueprint.json",
      "--out",
      roundTrip,
    );
    assert.equal(snapshot.status, 0, snapshot.stderr);
    for (const filename of [
      "pull-requests.svg",
      "stars.svg",
      "streak-spectrum.svg",
      "stats.svg",
      "repositories.svg",
      "frequency.svg",
      "streaks.svg",
    ])
      assert.equal(
        await readFile(path.join(roundTrip, filename), "utf8"),
        await readFile(path.join(out, filename), "utf8"),
      );
    assert.match(
      await readFile(path.join(roundTrip, "README.md"), "utf8"),
      /Sample artwork/,
    );
    assert.match(
      await readFile(path.join(roundTrip, "calendar.svg"), "utf8"),
      /Sample artwork/,
    );
    const legacyData = JSON.parse(
      await readFile(path.join(out, "profile-data.json"), "utf8"),
    );
    delete legacyData.activity;
    delete legacyData.repositories;
    const legacyFile = path.join(temp, "legacy.json");
    await writeFile(legacyFile, JSON.stringify(legacyData));
    const legacy = run(
      "--data",
      legacyFile,
      "--out",
      path.join(temp, "legacy"),
    );
    assert.equal(legacy.status, 0, legacy.stderr);
    assert.match(
      await readFile(path.join(temp, "legacy", "pull-requests.svg"), "utf8"),
      /—/,
    );
    const malformed = path.join(temp, "bad.json");
    await writeFile(
      malformed,
      JSON.stringify({ version: 1, palette: { accent: "url(evil)" } }),
    );
    assert.notEqual(
      run("--sample", "--recipe", malformed, "--out", path.join(temp, "bad"))
        .status,
      0,
    );
    assert.notEqual(
      run(
        "--sample",
        "--username",
        "uzuw",
        "--out",
        path.join(temp, "ambiguous"),
      ).status,
      0,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
