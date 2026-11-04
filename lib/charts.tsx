import type { Profile } from "./types";
import { activityInsights, activitySeries } from "./stats";
import { metricNames, type Metric, type Recipe } from "./recipe";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const tick = (n: number) =>
  n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
const trim = (text: string, length: number) =>
  [...text].length > length
    ? [...text].slice(0, length - 1).join("") + "…"
    : text;

export function metricValue(profile: Profile, key: Metric): number | null {
  if (key === "contributions") return profile.total;
  if (key === "stars") return profile.repositories?.stars ?? null;
  if (key === "repositories") return profile.repositories?.totalCount ?? null;
  if (
    key === "activeDays" ||
    key === "currentStreak" ||
    key === "longestStreak"
  )
    return profile.stats[key];
  return profile.activity?.[key] ?? null;
}

export function MetricGrid({
  profile,
  recipe,
}: {
  profile: Profile;
  recipe: Recipe;
}) {
  const columns = Math.min(4, recipe.metrics.length),
    width = 880 / columns;
  return (
    <g style={{ fontVariantNumeric: "tabular-nums" }}>
      {recipe.metrics.map((key, index) => {
        const value = metricValue(profile, key),
          text = value === null ? "—" : fmt(value);
        return (
          <g
            key={key}
            transform={`translate(${40 + (index % columns) * width} ${90 + Math.floor(index / columns) * 96})`}
          >
            <text
              y="30"
              fontSize={Math.min(
                36,
                (width - 24) / Math.max(text.length * 0.65, 1),
              )}
              fontWeight="650"
              fill="url(#d3)"
              stroke={recipe.palette.foreground}
              strokeWidth="0.4"
              paintOrder="stroke fill"
            >
              {text}
            </text>
            <text y="55" fontSize="12" fill={recipe.palette.muted}>
              {metricNames[key]}
            </text>
            <text y="73" fontSize="10" fill={recipe.palette.muted}>
              {key === "stars" || key === "repositories"
                ? "Public owned repos · now"
                : "Displayed period"}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function ActivityChart({
  profile,
  recipe,
  x = 40,
  y = 95,
  width = 880,
  height = 205,
}: {
  profile: Profile;
  recipe: Recipe;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const series = activitySeries(profile.weeks.flat(), recipe.groupBy);
  const max = Math.max(1, ...series.map((p) => p.count)),
    left = 40,
    top = 54,
    bottom = height - 35,
    plotWidth = width - left - 12;
  const px = (i: number) =>
    left +
    (series.length === 1
      ? plotWidth / 2
      : (i / Math.max(series.length - 1, 1)) * plotWidth);
  const py = (count: number) => bottom - (count / max) * (bottom - top);
  const points = series
    .map((p, i) => `${px(i).toFixed(2)},${py(p.count).toFixed(2)}`)
    .join(" ");
  return (
    <g transform={`translate(${x} ${y})`}>
      <text fontSize="18" fontWeight="600">
        Contribution curve
      </text>
      <text y="22" fontSize="11" fill={recipe.palette.muted}>
        Contributions per {recipe.groupBy} · UTC · partial periods included
      </text>
      {[0, 0.5, 1].map((ratio) => (
        <g key={ratio}>
          <line
            x1={left}
            x2={width}
            y1={py(max * ratio)}
            y2={py(max * ratio)}
            stroke={recipe.palette.grid}
          />
          <text
            x={left - 8}
            y={py(max * ratio) + 4}
            textAnchor="end"
            fontSize="10"
            fill={recipe.palette.muted}
          >
            {tick(max * ratio)}
          </text>
        </g>
      ))}
      {series.length > 0 && recipe.chartStyle === "area" && (
        <polygon
          points={`${px(0)},${bottom} ${points} ${px(series.length - 1)},${bottom}`}
          fill="url(#d2)"
        />
      )}
      {recipe.chartStyle === "bars" ? (
        series.map((point, i) => (
          <rect
            key={point.label}
            x={left + (i * plotWidth) / series.length}
            y={py(point.count)}
            width={Math.max(0.5, (plotWidth / series.length) * 0.7)}
            height={bottom - py(point.count)}
            fill="url(#d3)"
          >
            <title>{`${point.label}: ${point.count} contributions across ${point.days} observed days`}</title>
          </rect>
        ))
      ) : (
        <>
          <polyline
            points={points}
            fill="none"
            stroke={recipe.palette.accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {series.length === 1 && (
            <circle
              cx={px(0)}
              cy={py(series[0].count)}
              r="3"
              fill={recipe.palette.accent}
            />
          )}
        </>
      )}
      {series.length === 0 && (
        <text x={left} y={top + 35} fontSize="13" fill={recipe.palette.muted}>
          No observed activity dates in this period.
        </text>
      )}
      {series.length > 0 && (
        <>
          <text
            x={left}
            y={height - 9}
            fontSize="10"
            fill={recipe.palette.muted}
          >
            {series[0].label}
          </text>
          {series.length > 1 && (
            <text
              x={width}
              y={height - 9}
              textAnchor="end"
              fontSize="10"
              fill={recipe.palette.muted}
            >
              {series[series.length - 1].label}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function RepositoryList({
  profile,
  recipe,
  x = 40,
  y = 100,
  width = 880,
  compact = false,
}: {
  profile: Profile;
  recipe: Recipe;
  x?: number;
  y?: number;
  width?: number;
  compact?: boolean;
}) {
  const repos = profile.repositories,
    spacing = compact ? 64 : 76;
  return (
    <g transform={`translate(${x} ${y})`}>
      <text fontSize="18" fontWeight="600">
        Top repositories
      </text>
      <text y="23" fontSize="11" fill={recipe.palette.muted}>
        Public owned repositories · ranked by stars · now
      </text>
      {!repos || repos.top.length === 0 ? (
        <text y="65" fontSize="13" fill={recipe.palette.muted}>
          {repos
            ? "No public owned repositories yet."
            : "Repository data unavailable in this snapshot."}
        </text>
      ) : (
        repos.top.slice(0, recipe.repoCount).map((repo, i) => (
          <g key={repo.name} transform={`translate(0 ${49 + i * spacing})`}>
            <title>{`${repo.name}: ${fmt(repo.stars)} stars, ${fmt(repo.forks)} forks. ${repo.description}`}</title>
            <text fontSize="14" fontWeight="600">
              {trim(repo.name, compact ? 23 : 60)}
            </text>
            <text
              x={width}
              textAnchor="end"
              fontSize="12"
              fill={recipe.palette.accent}
            >
              {fmt(repo.stars)} stars
            </text>
            <text y="20" fontSize="11" fill={recipe.palette.muted}>
              {compact
                ? `${fmt(repo.forks)} forks`
                : trim(repo.description || "No description provided.", 110)}
            </text>
            <line y1="33" y2="33" x2={width} stroke={recipe.palette.grid} />
          </g>
        ))
      )}
      {!compact && repos && (
        <text
          y={
            68 +
            Math.max(1, Math.min(recipe.repoCount, repos.top.length)) * spacing
          }
          fontSize="11"
          fill={recipe.palette.muted}
        >
          {fmt(repos.stars)} stars across {fmt(repos.totalCount)} public owned
          repositories, including forks. Stars are current totals.
        </text>
      )}
    </g>
  );
}

export function InsightChart({
  profile,
  recipe,
  kind,
}: {
  profile: Profile;
  recipe: Recipe;
  kind: "rhythm" | "distribution" | "streaks";
}) {
  const data = activityInsights(profile.weeks.flat());
  const points =
    kind === "rhythm"
      ? data.weekdays.map((d) => ({
          label: d.label,
          count: d.days ? d.count / d.days : 0,
          detail: `${d.count} contributions across ${d.days} observed ${d.label} days; ${d.active} active`,
        }))
      : (kind === "streaks" ? data.streaks : data.distribution).map((p) => ({
          ...p,
          detail: `${p.label}: ${p.count} ${kind === "streaks" ? "runs" : "days"}`,
        }));
  const max = Math.max(1, ...points.map((p) => p.count));
  const title = {
    rhythm: "Weekday rhythm",
    distribution: "Activity distribution",
    streaks: "Streak spectrum",
  }[kind];
  const caption = {
    rhythm: "Average contributions per observed weekday · UTC",
    distribution:
      "How often each contribution count occurs · includes zero days",
    streaks:
      "How often active runs of each length occur · bounded by this period",
  }[kind];
  const width = 800 / Math.max(points.length, 1);
  return (
    <g transform="translate(40 94)">
      <text fontSize="22" fontWeight="600">
        {title}
      </text>
      <text y="26" fontSize="12" fill={recipe.palette.muted}>
        {caption}
      </text>
      {[0, 0.5, 1].map((ratio) => (
        <g key={ratio}>
          <line
            x1="45"
            x2="880"
            y1={220 - ratio * 142}
            y2={220 - ratio * 142}
            stroke={recipe.palette.grid}
          />
          <text
            x="34"
            y={224 - ratio * 142}
            textAnchor="end"
            fontSize="10"
            fill={recipe.palette.muted}
          >
            {tick(max * ratio)}
          </text>
        </g>
      ))}
      {points.map((point, i) => (
        <g key={point.label}>
          <rect
            x={65 + i * width}
            y={220 - (point.count / max) * 142}
            width={Math.min(95, width * 0.65)}
            height={(point.count / max) * 142}
            fill="url(#d3)"
          >
            <title>{point.detail}</title>
          </rect>
          {i % Math.max(1, Math.ceil(points.length / 16)) === 0 && (
            <text
              x={65 + i * width + Math.min(95, width * 0.65) / 2}
              y="243"
              textAnchor="middle"
              fontSize="12"
              fill={recipe.palette.muted}
            >
              {point.label}
            </text>
          )}
          {points.length <= 10 && (
            <text
              x={65 + i * width + Math.min(95, width * 0.65) / 2}
              y={208 - (point.count / max) * 142}
              textAnchor="middle"
              fontSize="13"
            >
              {fmt(point.count)}
            </text>
          )}
        </g>
      ))}
      {!points.length && (
        <text x="65" y="145" fontSize="14" fill={recipe.palette.muted}>
          No active streaks in this period.
        </text>
      )}
      <text
        x="460"
        y="278"
        textAnchor="middle"
        fontSize="11"
        fill={recipe.palette.muted}
      >
        {kind === "rhythm"
          ? "Weekday (average contributions/day)"
          : kind === "distribution"
            ? "Contributions per day → number of days"
            : "Consecutive active days → number of runs"}
      </text>
    </g>
  );
}

export function cardHeight(layout: string, recipe: Recipe) {
  const rows = Math.ceil(recipe.metrics.length / 4);
  if (layout === "overview")
    return 110 + rows * 96 + Math.max(220, recipe.repoCount * 64 + 35) + 65;
  if (layout === "stats") return 110 + rows * 96 + 60;
  if (layout === "repositories") return 210 + recipe.repoCount * 76;
  return layout === "calendar"
    ? 360
    : layout === "profile"
      ? 388
      : layout === "frequency"
        ? 380
        : 450;
}
