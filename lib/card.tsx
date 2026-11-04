import { renderToStaticMarkup } from "react-dom/server.node";
import type { ReactNode } from "react";
import {
  defaultRecipe,
  metricNames,
  type CardOptions,
  type Recipe,
} from "./recipe";
import type { Profile } from "./types";
import {
  ActivityChart,
  metricValue,
  cardHeight,
  InsightChart,
  MetricGrid,
  RepositoryList,
} from "./charts";

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function filledPositions(level: number): number[] {
  return BAYER.flatMap((rank, index) => (rank < level * 4 ? [index] : []));
}
const fonts = {
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Courier New', monospace",
  serif: "Georgia, 'Times New Roman', serif",
};
const fmt = (count: number) => count.toLocaleString("en-US");
const fitFont = (value: string, size: number, width: number) =>
  Math.min(size, width / Math.max([...value].length, 1));
const displayDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function Patterns({ recipe }: { recipe: Recipe }) {
  return (
    <defs>
      {[1, 2, 3, 4].map((level) => (
        <pattern
          id={`d${level}`}
          key={level}
          patternUnits="userSpaceOnUse"
          width="12"
          height="12"
        >
          <rect width="12" height="12" fill={recipe.palette.grid} />
          <g fill={recipe.palette.accent} shapeRendering="crispEdges">
            {filledPositions(level).map((index) => {
              const x = (index % 4) * 3,
                y = Math.floor(index / 4) * 3;
              return recipe.pattern === "dots" ? (
                <circle
                  key={index}
                  cx={x + 1.5}
                  cy={y + 1.5}
                  r="1.2"
                  shapeRendering="geometricPrecision"
                />
              ) : (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width="3"
                  height={recipe.pattern === "weave" ? 1.6 : 3}
                />
              );
            })}
          </g>
        </pattern>
      ))}
    </defs>
  );
}

function Canvas({
  recipe,
  height,
  title,
  description,
  children,
}: {
  recipe: Recipe;
  height: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="960"
      height={height}
      viewBox={`0 0 960 ${height}`}
      role="img"
      aria-labelledby="title desc"
    >
      <title id="title">{title}</title>
      <desc id="desc">{description}</desc>
      <Patterns recipe={recipe} />
      <rect
        x="0.5"
        y="0.5"
        width="959"
        height={height - 1}
        rx={recipe.radius}
        fill={recipe.palette.background}
        stroke={recipe.palette.grid}
      />
      <g fontFamily={fonts[recipe.font]} fill={recipe.palette.foreground}>
        {children}
      </g>
    </svg>
  );
}

function Calendar({ profile, recipe }: { profile: Profile; recipe: Recipe }) {
  const step = Math.min(16, 840 / Math.max(profile.weeks.length, 1));
  const months = new Set<string>();
  return (
    <>
      <text
        x="40"
        y="104"
        fontSize={fitFont(fmt(profile.total), 38, 420)}
        fontWeight="650"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {fmt(profile.total)}
        <tspan
          dx="12"
          fontSize="15"
          fontWeight="400"
          fill={recipe.palette.muted}
        >
          contributions in this period
        </tspan>
      </text>
      {[1, 3, 5].map((weekday, i) => (
        <text
          key={weekday}
          x="40"
          y={157 + weekday * 16}
          fontSize="10"
          fill={recipe.palette.muted}
        >
          {["M", "W", "F"][i]}
        </text>
      ))}
      {profile.weeks.map((week, column) => {
        const first =
          week.find((day) => day.date.slice(8) === "01") ??
          (column === 0 ? week[0] : undefined);
        const monthKey = first?.date.slice(0, 7);
        const showMonth = monthKey && !months.has(monthKey);
        if (monthKey) months.add(monthKey);
        return (
          <g key={column}>
            {showMonth && (
              <text
                x={64 + column * step}
                y="135"
                fontSize="10"
                fill={recipe.palette.muted}
              >
                {new Date(`${first!.date}T00:00:00Z`).toLocaleDateString(
                  "en-US",
                  { month: "short", timeZone: "UTC" },
                )}
              </text>
            )}
            {week.map((day) => (
              <rect
                key={day.date}
                x={64 + column * step}
                y={146 + day.weekday * 16}
                width={Math.min(12, step - 3)}
                height="12"
                rx="1"
                fill={day.level ? `url(#d${day.level})` : recipe.palette.grid}
              >
                <title>{`${day.date}: ${fmt(day.count)} contributions`}</title>
              </rect>
            ))}
          </g>
        );
      })}
      <text x="64" y="285" fontSize="12" fill={recipe.palette.muted}>
        {profile.stats.activeDays} active days
      </text>
      <text x="737" y="285" fontSize="11" fill={recipe.palette.muted}>
        Less
      </text>
      {[0, 1, 2, 3, 4].map((level) => (
        <rect
          key={level}
          x={772 + level * 19}
          y="274"
          width="12"
          height="12"
          rx="1"
          fill={level ? `url(#d${level})` : recipe.palette.grid}
        />
      ))}
      <text x="875" y="285" fontSize="11" fill={recipe.palette.muted}>
        More
      </text>
    </>
  );
}

function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines.length - 1;
    const letters = [...word];
    if (last >= 0 && [...`${lines[last]} ${word}`].length <= width)
      lines[last] += ` ${word}`;
    else if (letters.length <= width) lines.push(word);
    else
      for (let i = 0; i < letters.length; i += width)
        lines.push(letters.slice(i, i + width).join(""));
  }
  return lines;
}

function Portrait({ profile, recipe }: { profile: Profile; recipe: Recipe }) {
  const title = recipe.title || `Hello, I'm ${profile.username}.`;
  const seed = [...profile.username].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return (
    <>
      <text x="40" y="62" fontSize="13" fill={recipe.palette.muted}>
        @{profile.username}
      </text>
      {wrapText(title, 26).map((line, i) => (
        <text
          key={i}
          x="40"
          y={116 + i * 44}
          fontSize={fitFont(line, 37, 620)}
          fontWeight="650"
        >
          {line}
        </text>
      ))}
      {wrapText(recipe.subtitle, 58).map((line, i) => (
        <text
          key={i}
          x="40"
          y={250 + i * 21}
          fontSize={fitFont(line, 15, 620)}
          fill={recipe.palette.muted}
        >
          {line}
        </text>
      ))}
      <g aria-label="Dithered landscape">
        {Array.from({ length: 18 * 20 }, (_, i) => {
          const x = i % 18,
            y = Math.floor(i / 18);
          const wave = Math.sin(x / 3 + seed) * 2.5 + Math.cos(y / 4) * 2;
          const level = Math.max(0, Math.min(4, Math.floor((y + wave) / 4)));
          return (
            <rect
              key={i}
              x={704 + x * 12}
              y={42 + y * 12}
              width="12"
              height="12"
              fill={level ? `url(#d${level})` : recipe.palette.background}
            />
          );
        })}
      </g>
    </>
  );
}

export function renderCard(
  profile: Profile,
  options: CardOptions,
  sample = false,
): string {
  sample = sample || profile.source === "sample";
  const recipe = options.recipe ?? defaultRecipe(options.theme),
    portrait = options.layout === "profile";
  const height = cardHeight(options.layout, recipe);
  const title = portrait
    ? `${profile.username}'s profile`
    : `${profile.username}'s GitHub ${options.layout}`;
  const summary =
    options.layout === "stats"
      ? recipe.metrics
          .map(
            (metric) =>
              `${metricNames[metric]}: ${metricValue(profile, metric) === null ? "unavailable" : fmt(metricValue(profile, metric)!)}.`,
          )
          .join(" ")
      : options.layout === "repositories" && profile.repositories
        ? `${fmt(profile.repositories.stars)} current stars across ${fmt(profile.repositories.totalCount)} public owned repositories.`
        : `${fmt(profile.total)} contributions represented in the displayed period.`;
  const description = `${sample ? "Sample data. " : ""}${summary} ${displayDate(profile.start)} to ${displayDate(profile.end)}. Activity uses UTC dates; repository counts and stars are current totals. Cached updates.`;
  return `<?xml version="1.0" encoding="UTF-8"?>${renderToStaticMarkup(
    <Canvas
      recipe={recipe}
      height={height}
      title={title}
      description={description}
    >
      {!portrait && (
        <>
          <text
            x="40"
            y="43"
            fontSize={fitFont(recipe.title || `@${profile.username}`, 22, 430)}
            fontWeight="600"
          >
            {recipe.title || `@${profile.username}`}
          </text>
          <text
            x="920"
            y="42"
            textAnchor="end"
            fontSize="11"
            fill={recipe.palette.muted}
          >
            {displayDate(profile.start)} — {displayDate(profile.end)}
          </text>
        </>
      )}
      {options.layout === "calendar" ? (
        <Calendar profile={profile} recipe={recipe} />
      ) : options.layout === "stats" ? (
        <MetricGrid profile={profile} recipe={recipe} />
      ) : options.layout === "overview" ? (
        <>
          <MetricGrid profile={profile} recipe={recipe} />
          <ActivityChart
            profile={profile}
            recipe={recipe}
            y={110 + Math.ceil(recipe.metrics.length / 4) * 96}
            width={540}
            height={Math.max(220, recipe.repoCount * 64 + 35)}
          />
          <RepositoryList
            profile={profile}
            recipe={recipe}
            x={620}
            y={110 + Math.ceil(recipe.metrics.length / 4) * 96}
            width={300}
            compact
          />
        </>
      ) : options.layout === "frequency" ? (
        <ActivityChart profile={profile} recipe={recipe} height={215} />
      ) : options.layout === "repositories" ? (
        <RepositoryList profile={profile} recipe={recipe} />
      ) : options.layout === "profile" ? (
        <Portrait profile={profile} recipe={recipe} />
      ) : (
        <InsightChart profile={profile} recipe={recipe} kind={options.layout} />
      )}
      <line
        x1="40"
        x2="920"
        y1={height - 46}
        y2={height - 46}
        stroke={recipe.palette.grid}
      />
      <text
        x="40"
        y={height - 22}
        fontSize={fitFont(
          sample ? "Sample artwork · generated example data" : recipe.tagline,
          11,
          400,
        )}
        fill={recipe.palette.muted}
      >
        {sample ? "Sample artwork · generated example data" : recipe.tagline}
      </text>
      <text
        x="920"
        y={height - 22}
        fontSize={fitFont(
          portrait ? "Dither / profile" : `@${profile.username} / UTC`,
          11,
          340,
        )}
        textAnchor="end"
        fill={recipe.palette.muted}
      >
        {portrait ? "Dither / profile" : `@${profile.username} / UTC`}
      </text>
    </Canvas>,
  )}`;
}

export function renderLink(label: string, recipe: Recipe): string {
  return `<?xml version="1.0" encoding="UTF-8"?>${renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="320"
      height="72"
      viewBox="0 0 320 72"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <rect
        x="0.5"
        y="0.5"
        width="319"
        height="71"
        rx={recipe.radius / 2}
        fill={recipe.palette.background}
        stroke={recipe.palette.grid}
      />
      <text
        x="24"
        y="43"
        fontSize={fitFont(label, 16, 230)}
        fontFamily={fonts[recipe.font]}
        fill={recipe.palette.foreground}
      >
        {label}
      </text>
      <path
        d="M280 29h12v12m0-12-14 14"
        fill="none"
        stroke={recipe.palette.accent}
        strokeWidth="2"
      />
    </svg>,
  )}`;
}

export function renderError(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>${renderToStaticMarkup(
    <Canvas
      recipe={defaultRecipe()}
      height={160}
      title="Dither could not generate this card"
      description={message}
    >
      <text x="32" y="51" fontSize="22" fontWeight="600">
        This print will have to wait.
      </text>
      {wrapText(message, 104).map((line, index) => (
        <text key={index} x="32" y={84 + index * 20} fontSize="14">
          {line}
        </text>
      ))}
    </Canvas>,
  )}`;
}
