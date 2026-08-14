import type { StatCode } from "@/lib/skills-catalog";

type StatPoint = {
  code: StatCode;
  value: number;
  ceiling: number;
};

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 40;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointAt(index: number, total: number, fraction: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + fraction * RADIUS * Math.cos(angle),
    y: CENTER + fraction * RADIUS * Math.sin(angle),
  };
}

export function StatRadarChart({ stats }: { stats: StatPoint[] }) {
  const n = stats.length;
  const dataPoints = stats.map((s, i) =>
    pointAt(i, n, Math.min(s.value / s.ceiling, 1)),
  );
  const dataPath =
    dataPoints.map((p) => `${p.x},${p.y}`).join(" ") +
    (dataPoints.length ? ` ${dataPoints[0].x},${dataPoints[0].y}` : "");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-full w-full"
      role="img"
      aria-label="Stat radar chart"
    >
      {RINGS.map((ring) => {
        const ringPoints = stats
          .map((_, i) => pointAt(i, n, ring))
          .map((p) => `${p.x},${p.y}`)
          .join(" ");
        return (
          <polygon
            key={ring}
            points={ringPoints}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}

      {stats.map((_, i) => {
        const outer = pointAt(i, n, 1);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={dataPath}
        fill="var(--accent)"
        fillOpacity={0.12}
        stroke="var(--accent)"
        strokeWidth={1.5}
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--accent)" />
      ))}

      {stats.map((s, i) => {
        const labelPoint = pointAt(i, n, 1.22);
        return (
          <text
            key={s.code}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted font-mono text-[11px] uppercase tracking-wider"
          >
            {s.code}
          </text>
        );
      })}
    </svg>
  );
}
