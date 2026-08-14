export type StatHistoryPoint = { date: string; value: number };

export function StatHistoryChart({ points }: { points: StatHistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted">
        Not enough history yet.
      </div>
    );
  }

  const width = 600;
  const height = 160;
  const padding = 10;

  const values = points.map((p) => p.value);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const stepX = (width - padding * 2) / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: padding + i * stepX,
    y: padding + (1 - (p.value - minV) / range) * (height - padding * 2),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${height - padding} L${coords[0].x},${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Stat history over time"
    >
      <path d={areaPath} fill="var(--accent)" fillOpacity={0.08} stroke="none" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={1.5} fill="var(--accent)" />
      ))}
    </svg>
  );
}
