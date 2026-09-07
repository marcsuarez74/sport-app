export function Sparkline({ values, color = '#4f6bed', height = 48 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <p className="muted">Ajoutez au moins 2 pesées.</p>;
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min || 1)) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} role="img" aria-label="évolution du poids">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
