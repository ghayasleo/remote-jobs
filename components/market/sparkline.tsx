/** A small trend line, drawn once on the server. Decorative: the numbers beside it carry the meaning. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 3) return null;
  const width = 120;
  const height = 28;
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => `${((index / (values.length - 1)) * width).toFixed(1)},${(height - 2 - (value / max) * (height - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
