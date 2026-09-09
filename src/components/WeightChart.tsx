import type { WeightEntry } from '../lib/storage';
import { formatDayMonth } from '../lib/dates';

const W = 300;
const H = 78;
const PAD_G = 26; // marge gauche pour les labels kg
const Y_TOP = 9;
const Y_BOT = 62;

// Catmull-Rom → bézier cubique : courbe lissée passant par tous les points.
function cheminLisse(pts: Array<[number, number]>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function WeightChart({ weights, objectif }: { weights: WeightEntry[]; objectif?: number }) {
  if (weights.length < 2) {
    return <p className="muted">Ajoutez au moins 2 pesées pour voir la courbe.</p>;
  }
  const kg = weights.map((w) => w.kg);
  const min = Math.min(...kg, objectif ?? Infinity);
  const max = Math.max(...kg, objectif ?? -Infinity);
  const y = (v: number) => Y_BOT - ((v - min) / (max - min)) * (Y_BOT - Y_TOP);
  const pts = weights.map((w, i): [number, number] => [
    PAD_G + (i / (weights.length - 1)) * (W - PAD_G),
    y(w.kg),
  ]);
  const premier = weights[0];
  const dernier = weights[weights.length - 1];
  const objectifY = objectif != null ? y(objectif) : null;
  const grid = [max, (min + max) / 2, min];
  const aire = `${cheminLisse(pts)} L ${W} ${Y_BOT} L ${PAD_G} ${Y_BOT} Z`;

  return (
    <div className="weight-chart">
      <div className="weight-chips">
        <div className="weight-chip">
          <span className="stat-label">Départ</span>
          <strong>{premier.kg} kg</strong>
        </div>
        <div className="weight-chip">
          <span className="stat-label">Actuel</span>
          <strong className="weight-actuel">{dernier.kg} kg</strong>
        </div>
        <div className="weight-chip">
          <span className="stat-label">Objectif</span>
          <strong className="weight-objectif">{objectif != null ? `${objectif} kg` : '—'}</strong>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="weight-curve"
        role="img"
        aria-label={`Courbe de poids de ${premier.kg} à ${dernier.kg} kg`}
      >
        <defs>
          <linearGradient id="poids-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((v) => (
          <g key={v}>
            <line x1={PAD_G} y1={y(v)} x2={W} y2={y(v)} className="weight-grid" />
            <text x={PAD_G - 4} y={y(v) + 3} textAnchor="end" className="weight-grid-label">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {objectifY != null && (
          <>
            <line x1={PAD_G} y1={objectifY} x2={W} y2={objectifY} className="weight-objectif-ligne" />
            <text x={W} y={objectifY - 4} textAnchor="end" className="weight-objectif-texte">
              Objectif {objectif}
            </text>
          </>
        )}
        <path d={aire} fill="url(#poids-aire)" />
        <path d={cheminLisse(pts)} fill="none" className="weight-ligne" />
        <circle cx={pts[0][0]} cy={pts[0][1]} r="4" className="weight-point weight-point-depart" />
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="4.5"
          className="weight-point weight-point-actuel"
        />
        <text x={pts[0][0] + 8} y={pts[0][1] + 1} className="weight-label">
          {premier.kg} kg
        </text>
        <text x={pts[pts.length - 1][0] - 8} y={pts[pts.length - 1][1] - 9} textAnchor="end" className="weight-label weight-label-actuel">
          {dernier.kg} kg
        </text>
        <line x1={PAD_G} y1={Y_BOT} x2={W} y2={Y_BOT} className="weight-axe" />
        <text x={PAD_G} y={H - 5} className="weight-mois">
          {formatDayMonth(premier.date)}
        </text>
        <text x={W} y={H - 5} textAnchor="end" className="weight-mois">
          {formatDayMonth(dernier.date)}
        </text>
      </svg>
    </div>
  );
}
