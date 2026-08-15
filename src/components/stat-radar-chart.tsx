export type RadarPoint = {
  label: string;
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

// Multi-word labels (e.g. "Reverse Engineering") wrap onto two lines instead
// of overflowing the chart — single-word ones (STR, Cryptography) stay put.
function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length <= 1) return [label.toUpperCase()];
  const mid = Math.ceil(words.length / 2);
  return [
    words.slice(0, mid).join(" ").toUpperCase(),
    words.slice(mid).join(" ").toUpperCase(),
  ];
}

export function StatRadarChart({ stats }: { stats: RadarPoint[] }) {
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
      aria-label="Radar chart"
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
        fillOpacity={0.18}
        stroke="var(--accent)"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.35))" }}
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--accent)" />
      ))}

      {stats.map((s, i) => {
        const labelPoint = pointAt(i, n, 1.2);
        const lines = wrapLabel(s.label);
        const startY = lines.length > 1 ? labelPoint.y - 14 : labelPoint.y - 7;
        return (
          <g key={s.label}>
            {lines.map((line, li) => (
              <text
                key={li}
                x={labelPoint.x}
                y={startY + li * 11}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted font-mono text-[10px] tracking-wider"
              >
                {line}
              </text>
            ))}
            <text
              x={labelPoint.x}
              y={startY + lines.length * 11 + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-accent font-mono text-[11px]"
            >
              {s.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
