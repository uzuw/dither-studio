"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  encodeRecipe,
  FONTS,
  metricNames,
  CHART_STYLES,
  GROUPS,
  normalizeUsername,
  parseRecipe,
  PATTERNS,
  type CardOptions,
  type Recipe,
} from "../lib/recipe";
import { matchingPreset, presets } from "../lib/presets";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CARD_TYPES,
  cards,
  cardRecipe,
  parseCardOptions,
  cardParams,
  cardImagePath,
  sampleImagePath,
  cardEditorPath,
  type CardType,
} from "../lib/cards";
import type { Profile } from "../lib/types";
import { Icon } from "./icon";
import { cardHeight, metricValue } from "../lib/charts";

type View =
  | { kind: "sample" }
  | { kind: "loading" }
  | { kind: "ready"; profile: Profile }
  | { kind: "error"; message: string };
const subscribeOrigin = () => () => {};

function saveFile(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Generator({
  cardType,
  initialUsername = "",
  initialOptions,
  initialError,
}: {
  cardType: CardType;
  initialUsername?: string;
  initialOptions: CardOptions;
  initialError?: string;
}) {
  const router = useRouter();
  const definition = cards[cardType];
  const availableMetrics = definition.metrics ?? [];
  const metricLimit = Math.min(8, availableMetrics.length);
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
      initialOptions.recipe ?? cardRecipe(cardType, initialOptions.theme),
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
  const recipe = options.recipe ?? cardRecipe(cardType, options.theme);
  const selectedPreset = matchingPreset(recipe);
  const imagePath =
    view.kind === "ready"
      ? cardImagePath(view.profile.username, cardType, options)
      : sampleImagePath(cardType, options);
  const imageUrl = origin + imagePath;
  const markdown =
    view.kind === "ready"
      ? `[![${view.profile.username}'s GitHub ${definition.title.toLowerCase()}](${imageUrl})](https://github.com/${view.profile.username})`
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
    const params = cardParams(options);
    if (options.recipe && options.theme !== "paper")
      params.set("theme", options.theme);
    if (view.kind === "ready") params.set("username", view.profile.username);
    else if (request) params.set("username", request.username);
    window.history.replaceState(
      null,
      "",
      `/cards/${cardType}${params.size ? `?${params}` : ""}`,
    );
  }, [cardType, options, request, view]);

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

  function updateRecipe(patch: Partial<Recipe>, theme = options.theme) {
    try {
      const next = parseRecipe({ ...recipe, ...patch });
      parseCardOptions(
        cardType,
        new URLSearchParams({ recipe: encodeRecipe(next) }),
      );
      setOptions((current) => ({ ...current, theme, recipe: next }));
      setDraft(JSON.stringify(next, null, 2));
      setRecipeError("");
      setImageError(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "This design could not be applied.";
      setRecipeError(message);
      setNotice(message);
    }
  }
  function applyRecipe() {
    try {
      const next = parseRecipe(JSON.parse(draft));
      parseCardOptions(
        cardType,
        new URLSearchParams({ recipe: encodeRecipe(next) }),
      );
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
        `dither-${view.kind === "ready" ? view.profile.username : "sample"}-${cardType}.svg`,
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
            {definition.title}.
            <br />
            Printed your way.
          </h1>
          <p>
            {definition.description}
            <br className="desktop-break" /> Customize this card and copy its
            own README embed.
          </p>
        </div>
        <div className="intro-note">
          <span className="tiny-dither" aria-hidden="true" />
          <p>
            The numbers.
            <br />
            And the shape of your work.
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
            <legend>Your card</legend>
            <label className="control-label" htmlFor="card-type">
              Card type
            </label>
            <select
              id="card-type"
              value={cardType}
              onChange={(event) => {
                const next = event.target.value as CardType;
                router.push(
                  cardEditorPath(
                    next,
                    view.kind === "ready"
                      ? view.profile.username
                      : (request?.username ?? ""),
                    {
                      layout: cards[next].layout,
                      theme: options.theme,
                      recipe: options.recipe
                        ? cardRecipe(next, options.theme, options.recipe)
                        : undefined,
                    },
                  ),
                );
              }}
            >
              {CARD_TYPES.map((type) => (
                <option value={type} key={type}>
                  {cards[type].title}
                </option>
              ))}
            </select>
            <p className="help layout-description">{definition.description}</p>
            <Link className="all-cards-link" href="/">
              Browse all cards
            </Link>
          </fieldset>

          <fieldset className="palette-picker">
            <legend>Theme presets</legend>
            <p className="help preset-help">
              Pick a starting look, then fine-tune below.
            </p>
            <div className="palette-options">
              {presets.map((preset) => (
                <label
                  key={preset.id}
                  className={`palette-option ${selectedPreset?.id === preset.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={preset.id}
                    checked={selectedPreset?.id === preset.id}
                    onChange={() => updateRecipe(preset.design, preset.theme)}
                  />
                  <span
                    className={`palette-swatch ${preset.design.pattern}`}
                    style={{
                      backgroundColor: preset.design.palette.background,
                      color: preset.design.palette.accent,
                    }}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="preset-name">
                    {preset.name}
                    {selectedPreset?.id === preset.id && (
                      <Icon name="check" size={12} />
                    )}
                  </span>
                </label>
              ))}
            </div>
            <p className="help preset-status" aria-live="polite">
              {selectedPreset ? `${selectedPreset.name} selected` : "Custom design"}
            </p>
          </fieldset>

          <fieldset className="color-controls">
            <legend>Colors &amp; background</legend>
            {(Object.keys(recipe.palette) as (keyof Recipe["palette"])[]).map(
              (key) => (
                <div className="accent-row" key={key}>
                  <label htmlFor={`color-${key}`}>
                    {
                      {
                        background: "Background",
                        foreground: "Text color",
                        muted: "Secondary text",
                        accent: "Ink color",
                        grid: "Grid & texture",
                      }[key]
                    }
                  </label>
                  <div>
                    <input
                      id={`color-${key}`}
                      type="color"
                      value={recipe.palette[key]}
                      onChange={(event) =>
                        updateRecipe({
                          palette: {
                            ...recipe.palette,
                            [key]: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              ),
            )}
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
          </div>
          <details className="control-details">
            <summary>Text &amp; corners</summary>
            <div className="detail-controls custom-design">
              <label htmlFor="card-title">Card title</label>
              <input
                id="card-title"
                type="text"
                value={recipe.title}
                maxLength={64}
                placeholder="Use my GitHub username"
                onChange={(event) =>
                  updateRecipe({ title: event.target.value })
                }
              />
              {options.layout === "profile" && (
                <>
                  <label htmlFor="card-subtitle">Introduction</label>
                  <input
                    id="card-subtitle"
                    value={recipe.subtitle}
                    maxLength={140}
                    onChange={(event) =>
                      updateRecipe({ subtitle: event.target.value })
                    }
                  />
                </>
              )}
              <label htmlFor="card-footer">Footer text</label>
              <input
                id="card-footer"
                value={recipe.tagline}
                maxLength={64}
                onChange={(event) =>
                  updateRecipe({ tagline: event.target.value })
                }
              />
              <label htmlFor="corner-radius">
                Corner radius: {recipe.radius}
              </label>
              <input
                id="corner-radius"
                type="range"
                min="0"
                max="24"
                value={recipe.radius}
                onChange={(event) =>
                  updateRecipe({ radius: Number(event.target.value) })
                }
              />
            </div>
          </details>
          {options.layout === "frequency" && (
            <fieldset className="chart-controls detail-controls">
              <legend>Contribution curve</legend>
              <label htmlFor="chart-style">Chart style</label>
              <select
                id="chart-style"
                value={recipe.chartStyle}
                onChange={(event) =>
                  updateRecipe({
                    chartStyle: event.target.value as Recipe["chartStyle"],
                  })
                }
              >
                {CHART_STYLES.map((style) => (
                  <option value={style} key={style}>
                    {
                      { area: "Dithered area", line: "Line", bars: "Bars" }[
                        style
                      ]
                    }
                  </option>
                ))}
              </select>
              <label htmlFor="group-by">Group contributions by</label>
              <select
                id="group-by"
                value={recipe.groupBy}
                onChange={(event) =>
                  updateRecipe({
                    groupBy: event.target.value as Recipe["groupBy"],
                  })
                }
              >
                {GROUPS.map((group) => (
                  <option value={group} key={group}>
                    {{ day: "Day", week: "Week", month: "Month" }[group]}
                  </option>
                ))}
              </select>
            </fieldset>
          )}

          {options.layout === "stats" && (
            <details className="control-details">
              <summary>
                Metrics &amp; order{" "}
                <span>
                  {recipe.metrics.length}/{metricLimit}
                </span>
              </summary>
              <fieldset className="metric-picker">
                <legend className="help">
                  Choose the metrics for this card
                </legend>
                {availableMetrics.map((metric) => (
                  <label key={metric}>
                    <input
                      type="checkbox"
                      checked={recipe.metrics.includes(metric)}
                      disabled={
                        (!recipe.metrics.includes(metric) &&
                          recipe.metrics.length === metricLimit) ||
                        (recipe.metrics.includes(metric) &&
                          recipe.metrics.length === 1)
                      }
                      onChange={(event) =>
                        updateRecipe({
                          metrics: event.target.checked
                            ? [...recipe.metrics, metric]
                            : recipe.metrics.filter(
                                (value) => value !== metric,
                              ),
                        })
                      }
                    />
                    {metricNames[metric]}
                  </label>
                ))}
              </fieldset>
              <ol className="metric-order" aria-label="Metric display order">
                {recipe.metrics.map((metric, index) => (
                  <li key={metric}>
                    <span>{metricNames[metric]}</span>
                    <button
                      disabled={index === 0}
                      aria-label={`Move ${metricNames[metric]} earlier`}
                      onClick={() => {
                        const metrics = [...recipe.metrics];
                        [metrics[index - 1], metrics[index]] = [
                          metrics[index],
                          metrics[index - 1],
                        ];
                        updateRecipe({ metrics });
                      }}
                    >
                      Earlier
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {options.layout === "repositories" && (
            <div className="detail-controls repo-controls">
              <label htmlFor="repo-count">Repositories to show</label>
              <select
                id="repo-count"
                value={recipe.repoCount}
                onChange={(event) =>
                  updateRecipe({ repoCount: Number(event.target.value) })
                }
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            <span className="file-type">SVG / {cardType}</span>
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
                  height={cardHeight(options.layout, recipe)}
                  className="card-artwork"
                  alt={`${view.kind === "sample" ? "Sample" : view.profile.username + "'s"} ${definition.title.toLowerCase()}, rendered as dithered SVG artwork`}
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
                  ? definition.metrics
                    ? recipe.metrics
                        .map(
                          (metric) =>
                            `${metricNames[metric]}: ${metricValue(view.profile, metric)?.toLocaleString() ?? "unavailable"}`,
                        )
                        .join(" · ")
                    : `${view.profile.total.toLocaleString()} contributions · ${view.profile.stats.activeDays} active days · UTC`
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
              Activity and streaks cover {view.profile.start.slice(0, 10)} to{" "}
              {view.profile.end.slice(0, 10)} (UTC). Stars and repository counts
              are current public totals. Cached updates; GitHub may refresh
              README images later.
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
                      JSON.stringify(
                        cardRecipe(cardType, options.theme),
                        null,
                        2,
                      ),
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
            “Show my PRs, stars, and contribution curve. Put weekday rhythm
            alongside a streak spectrum. Make it a blue risograph.”
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
