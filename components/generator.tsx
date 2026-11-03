"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  cardPath,
  defaultRecipe,
  encodeRecipe,
  FONTS,
  LAYOUTS,
  normalizeUsername,
  optionParams,
  palettes,
  parseRecipe,
  PATTERNS,
  type CardOptions,
  type Layout,
  type Recipe,
  type Theme,
} from "../lib/recipe";
import type { Profile } from "../lib/types";
import { Icon } from "./icon";

type View =
  | { kind: "sample" }
  | { kind: "loading" }
  | { kind: "ready"; profile: Profile }
  | { kind: "error"; message: string };
const subscribeOrigin = () => () => {};
const layoutNames: Record<Layout, string> = {
  calendar: "Contribution graph",
  stats: "Stats card",
  profile: "Profile header",
};

function saveFile(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Generator({
  initialUsername = "",
  initialOptions,
  initialError,
}: {
  initialUsername?: string;
  initialOptions: CardOptions;
  initialError?: string;
}) {
  const [input, setInput] = useState(initialUsername);
  const [request, setRequest] = useState<{
    username: string;
    serial: number;
  } | null>(
    initialUsername && !initialError
      ? { username: initialUsername, serial: 0 }
      : null,
  );
  const [view, setView] = useState<View>(
    initialError
      ? { kind: "error", message: initialError }
      : initialUsername
        ? { kind: "loading" }
        : { kind: "sample" },
  );
  const [options, setOptions] = useState(initialOptions);
  const [draft, setDraft] = useState(
    JSON.stringify(
      initialOptions.recipe ?? defaultRecipe(initialOptions.theme),
      null,
      2,
    ),
  );
  const [recipeError, setRecipeError] = useState("");
  const [notice, setNotice] = useState("");
  const [imageError, setImageError] = useState(false);
  const recipeEditor = useRef<HTMLDetailsElement>(null);
  const origin = useSyncExternalStore(
    subscribeOrigin,
    () => window.location.origin,
    () => "",
  );
  const recipe = options.recipe ?? defaultRecipe(options.theme);
  const serialized = optionParams(options).toString();
  const imagePath =
    view.kind === "ready"
      ? cardPath(view.profile.username, options)
      : `/api/sample${serialized ? `?${serialized}` : ""}`;
  const imageUrl = origin + imagePath;
  const markdown =
    view.kind === "ready"
      ? `[![${view.profile.username}'s GitHub ${options.layout}](${imageUrl})](https://github.com/${view.profile.username})`
      : "Generate your card to get a README snippet.";
  const canExport = view.kind === "ready" && !imageError && !!origin;

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/profile/${encodeURIComponent(request!.username)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Couldn't load this profile. Try again.",
          );
        if (!controller.signal.aborted)
          setView({ kind: "ready", profile: data as Profile });
      } catch (error) {
        if (!controller.signal.aborted)
          setView({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Couldn't load this profile. Try again.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [request]);

  useEffect(() => {
    const params = optionParams(options);
    if (options.recipe && options.theme !== "paper")
      params.set("theme", options.theme);
    if (view.kind === "ready") params.set("username", view.profile.username);
    else if (request) params.set("username", request.username);
    window.history.replaceState(
      null,
      "",
      `/${params.size ? `?${params}` : ""}`,
    );
  }, [options, request, view]);

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setImageError(false);
    try {
      const username = normalizeUsername(input);
      setInput(username);
      setView({ kind: "loading" });
      setRequest((current) => ({
        username,
        serial: (current?.serial ?? 0) + 1,
      }));
    } catch (error) {
      setRequest(null);
      setView({ kind: "error", message: (error as Error).message });
    }
  }

  function updateRecipe(patch: Partial<Recipe>) {
    const next = parseRecipe({ ...recipe, ...patch });
    setOptions((current) => ({ ...current, recipe: next }));
    setDraft(JSON.stringify(next, null, 2));
    setRecipeError("");
    setImageError(false);
  }
  function themeChanged(theme: Theme) {
    setOptions((current) => ({
      ...current,
      theme,
      recipe: current.recipe
        ? { ...current.recipe, palette: { ...palettes[theme] } }
        : undefined,
    }));
    setDraft(JSON.stringify({ ...recipe, palette: palettes[theme] }, null, 2));
    setImageError(false);
  }
  function applyRecipe() {
    try {
      const next = parseRecipe(JSON.parse(draft));
      encodeRecipe(next);
      setOptions((current) => ({ ...current, recipe: next }));
      setRecipeError("");
      setImageError(false);
      setNotice("Recipe applied. Your preview and embed now use this design.");
    } catch (error) {
      setRecipeError(
        error instanceof Error ? error.message : "Enter a valid JSON recipe.",
      );
    }
  }
  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setNotice("Clipboard unavailable. Select and copy the snippet below.");
    }
  }
  async function download() {
    try {
      const response = await fetch(imagePath);
      if (!response.ok)
        throw new Error(
          "The image couldn't be downloaded. Try generating it again.",
        );
      saveFile(
        await response.text(),
        `dither-${view.kind === "ready" ? view.profile.username : "sample"}-${options.layout}.svg`,
        "image/svg+xml",
      );
      setNotice("SVG downloaded.");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  return (
    <>
      <section className="intro" aria-labelledby="studio-title">
        <div className="intro-copy">
          <h1 id="studio-title">
            A little less grid.
            <br />A little more you.
          </h1>
          <p>
            Turn your GitHub activity into a print worth keeping.
            <br className="desktop-break" /> Dithered graphs, personal stats,
            and a README with character.
          </p>
        </div>
        <div className="intro-note">
          <span className="tiny-dither" aria-hidden="true" />
          <p>
            Small contributions.
            <br />
            Distinct impressions.
          </p>
        </div>
      </section>

      <section className="studio" aria-label="GitHub card studio">
        <aside className="controls">
          <form onSubmit={generate} className="username-form">
            <label htmlFor="username">Start with your GitHub</label>
            <div className="username-input">
              <span aria-hidden="true">@</span>
              <input
                id="username"
                name="username"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="your-username"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={39}
                required
                aria-describedby="username-help"
              />
            </div>
            <span id="username-help" className="help">
              Public activity. No sign-in needed.
            </span>
            <button type="submit" className="button primary">
              {view.kind === "loading" ? "Printing…" : "Generate my card"}
              <Icon name="arrow" />
            </button>
          </form>

          <fieldset className="layout-picker">
            <legend>Make it yours</legend>
            <span className="control-label">Layout</span>
            {LAYOUTS.map((layout) => (
              <label
                className={`layout-option ${options.layout === layout ? "selected" : ""}`}
                key={layout}
              >
                <input
                  type="radio"
                  name="layout"
                  value={layout}
                  checked={options.layout === layout}
                  onChange={() => {
                    setOptions((current) => ({ ...current, layout }));
                    setImageError(false);
                  }}
                />
                <span className={`layout-glyph ${layout}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>{layoutNames[layout]}</span>
                {options.layout === layout && <Icon name="check" size={15} />}
              </label>
            ))}
          </fieldset>

          <fieldset className="palette-picker">
            <legend>Palette</legend>
            <div className="palette-options">
              {(["paper", "midnight"] as const).map((theme) => (
                <label
                  key={theme}
                  className={`palette-option ${options.theme === theme ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={options.theme === theme}
                    onChange={() => themeChanged(theme)}
                  />
                  <span
                    className={`palette-swatch ${theme}`}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{theme === "paper" ? "Paper" : "Midnight"}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="detail-controls">
            <label htmlFor="pattern">Dither texture</label>
            <select
              id="pattern"
              value={recipe.pattern}
              onChange={(event) =>
                updateRecipe({
                  pattern: event.target.value as Recipe["pattern"],
                })
              }
            >
              {PATTERNS.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {
                    {
                      bayer: "Ordered pixels",
                      dots: "Halftone dots",
                      weave: "Woven ink",
                    }[pattern]
                  }
                </option>
              ))}
            </select>
            <label htmlFor="font">Type style</label>
            <select
              id="font"
              value={recipe.font}
              onChange={(event) =>
                updateRecipe({ font: event.target.value as Recipe["font"] })
              }
            >
              {FONTS.map((font) => (
                <option value={font} key={font}>
                  {
                    {
                      sans: "Modern sans",
                      mono: "Monospace",
                      serif: "Editorial serif",
                    }[font]
                  }
                </option>
              ))}
            </select>
            <div className="accent-row">
              <label htmlFor="accent">Ink color</label>
              <div>
                <code>{recipe.palette.accent}</code>
                <input
                  id="accent"
                  type="color"
                  value={recipe.palette.accent}
                  onChange={(event) =>
                    updateRecipe({
                      palette: {
                        ...recipe.palette,
                        accent: event.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
          <button
            className="recipe-toggle"
            onClick={() => {
              if (recipeEditor.current) {
                recipeEditor.current.open = true;
                recipeEditor.current.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                  block: "center",
                });
              }
            }}
          >
            <Icon name="code" size={16} /> Edit the whole recipe
          </button>
        </aside>

        <div className="workspace">
          <div className="preview-toolbar">
            <span className="preview-status">
              <i className={view.kind === "ready" ? "live" : ""} />
              {view.kind === "sample"
                ? "Sample print"
                : view.kind === "ready"
                  ? `Printed for @${view.profile.username}`
                  : view.kind === "loading"
                    ? "Fetching your activity"
                    : "Print paused"}
            </span>
            <span className="file-type">SVG / {options.layout}</span>
          </div>
          <div className={`print-bed ${options.theme}`}>
            <span className="crop-mark top-left" />
            <span className="crop-mark top-right" />
            <span className="crop-mark bottom-left" />
            <span className="crop-mark bottom-right" />
            {view.kind === "loading" ? (
              <div className="preview-message" role="status">
                <span className="printing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <h2>Gathering the little things.</h2>
                <p>Your GitHub activity is on its way.</p>
              </div>
            ) : view.kind === "error" ? (
              <div className="preview-message error" role="alert">
                <Icon name="github" size={28} />
                <h2>This print will have to wait.</h2>
                <p>{view.message}</p>
              </div>
            ) : (
              <div
                className={`artwork-scroll ${options.layout}`}
                role="region"
                aria-label="Card preview"
                tabIndex={0}
              >
                {/* This endpoint is also the README artifact; next/image would change that contract. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={imagePath}
                  src={imagePath}
                  width="960"
                  height={
                    options.layout === "calendar"
                      ? 360
                      : options.layout === "stats"
                        ? 300
                        : 388
                  }
                  className="card-artwork"
                  alt={`${view.kind === "sample" ? "Sample" : view.profile.username + "'s"} ${layoutNames[options.layout].toLowerCase()}, rendered as dithered SVG artwork`}
                  onError={() => setImageError(true)}
                />
              </div>
            )}
          </div>
          {(view.kind === "sample" || view.kind === "ready") && (
            <p className="mobile-scroll-hint">
              Scroll the preview to see the full print.
            </p>
          )}
          <div className="print-caption">
            <span>
              {view.kind === "sample"
                ? "Example data. Enter a username to print the real thing."
                : view.kind === "ready"
                  ? `${view.profile.total.toLocaleString()} contributions · ${view.profile.stats.activeDays} active days · UTC`
                  : "Your preview and README use the same image."}
            </span>
            <span>Static art. Lasting impression.</span>
          </div>
          {imageError && (
            <p role="alert" className="inline-error">
              The image could not load. Try generating the card again.
            </p>
          )}
          {view.kind === "ready" && (
            <p className="freshness">
              Data fetched {new Date(view.profile.fetchedAt).toLocaleString()} ·
              Cached updates; GitHub may refresh README images later.
              {view.profile.total === 0
                ? " No contributions in this period yet. Your first dot is still ahead."
                : ""}
            </p>
          )}

          <section className="export" aria-labelledby="export-title">
            <div className="section-heading">
              <div>
                <h2 id="export-title">Give it a home.</h2>
                <p>One line in your README. All your own.</p>
              </div>
              <button
                className="button dark"
                disabled={!canExport}
                onClick={() =>
                  copy(
                    markdown,
                    "Markdown copied. Paste it into your GitHub README.",
                  )
                }
              >
                <Icon name="copy" /> Copy Markdown
              </button>
            </div>
            <pre
              className="embed-code"
              tabIndex={0}
              aria-label="README Markdown"
            >
              <code>{markdown}</code>
            </pre>
            <div className="export-bottom">
              <p>
                <span className="export-dot" /> No tracking. No badges. Just
                your work.
              </p>
              <div className="export-actions">
                <button
                  disabled={!canExport}
                  onClick={() => copy(imageUrl, "Image URL copied.")}
                >
                  Copy image URL
                </button>
                <button
                  disabled={
                    (view.kind !== "sample" && !canExport) || imageError
                  }
                  onClick={download}
                >
                  <Icon name="download" size={15} />
                  {view.kind === "sample" ? "Download sample" : "Download SVG"}
                </button>
              </div>
            </div>
          </section>

          <details className="recipe-editor" ref={recipeEditor}>
            <summary>
              <span>
                <Icon name="code" /> Your design, as a recipe
              </span>
              <span>For you and your agent</span>
            </summary>
            <div className="recipe-content">
              <p>
                Edit this JSON, or give it to your favorite coding agent. It
                controls every card and travels with your embed URL.
              </p>
              <label htmlFor="recipe-json">Card recipe (JSON)</label>
              <textarea
                id="recipe-json"
                spellCheck={false}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={16}
                aria-describedby="recipe-feedback"
              />
              <p
                id="recipe-feedback"
                role={recipeError ? "alert" : undefined}
                className={recipeError ? "inline-error" : "help"}
              >
                {recipeError ||
                  "Version 1 · safe colors, text, fonts, patterns, corners, and links. Check contrast after changing colors."}
              </p>
              <div className="recipe-actions">
                <button className="button primary" onClick={applyRecipe}>
                  Apply recipe
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    saveFile(
                      JSON.stringify(recipe, null, 2) + "\n",
                      "dither.recipe.json",
                      "application/json",
                    );
                    setNotice("Recipe downloaded.");
                  }}
                >
                  Download recipe
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setOptions((current) => ({
                      ...current,
                      recipe: undefined,
                    }));
                    setDraft(
                      JSON.stringify(defaultRecipe(options.theme), null, 2),
                    );
                    setRecipeError("");
                    setImageError(false);
                  }}
                >
                  Reset design
                </button>
              </div>
            </div>
          </details>
          <p className="notification" role="status" aria-live="polite">
            {notice}
          </p>
        </div>
      </section>

      <section
        className="agent-section"
        id="agents"
        aria-labelledby="agents-title"
      >
        <div className="agent-heading">
          <span className="agent-symbol" aria-hidden="true">
            <Icon name="code" size={28} />
          </span>
          <h2 id="agents-title">
            Bring your own imagination.
            <br />
            And your own agent.
          </h2>
        </div>
        <div className="agent-copy">
          <p>
            “Make mine feel like a blue risograph. Add a personal intro, a
            contribution graph, and my social links.”
          </p>
          <span>
            Give the recipe and our open skill to Codex, Claude, Hermes, or any
            agent that reads Markdown. Keep tweaking. The source is yours.
          </span>
          <a href="/guide" className="guide-link">
            Get the agent skill <Icon name="arrow" size={16} />
          </a>
        </div>
      </section>
    </>
  );
}
