import { useState } from 'react';
import type { DepenseEntry, UserProfile, WeeklyData } from '../../lib/model';
import { getDepenses } from '../../lib/storage';
import { formatEuro } from '../../lib/prix';
import { Icon } from '../Icon';

// Somme des dépenses dont la date appartient à [du..au] — comparaison par
// chaînes ISO (jamais new Date sur une forme date-only, qui parserait en UTC).
// Interne au fichier (lint react-refresh : seul le composant s'exporte).
const payeSurSemaine = (depenses: DepenseEntry[], du: string, au: string): number =>
  depenses
    .filter((d) => d.date >= du && d.date <= au)
    .reduce((somme, d) => somme + d.total, 0);

export function CoursesBudget({
  data,
  profile,
  onOuvrirDepenses,
}: {
  data: WeeklyData;
  profile: UserProfile;
  onOuvrirDepenses: (focusTotal: boolean) => void;
}) {
  const [depenses] = useState<DepenseEntry[]>(() => getDepenses());

  const paye = payeSurSemaine(depenses, data.meta.du, data.meta.au);
  const enSemaine = depenses.some((d) => d.date >= data.meta.du && d.date <= data.meta.au);
  // Carte visible seulement si au moins une donnée existe (spec § 3).
  if (!data.budget && profile.budgetMax === undefined && !enSemaine) return null;

  const max = profile.budgetMax;
  const maxConnu = max !== undefined && enSemaine;
  const pct = maxConnu ? Math.round((paye / max) * 100) : null;
  const depasse = maxConnu && paye > max;

  return (
    <section className="bud" aria-label="Budget courses">
      <div className="bud-head">
        <b>Budget courses</b>
        {profile.magasin && (
          <span className="mag">
            <Icon name="cart" size={11} />
            {profile.magasin}
          </span>
        )}
      </div>
      <div className={`bud-grid${max === undefined ? ' cols2' : ''}`}>
        {data.budget && (
          <div className="bud-cell">
            <span className="l">Estimé menu</span>
            <span className="v">{data.budget}</span>
          </div>
        )}
        <div className="bud-cell">
          <span className="l">Payé cette semaine</span>
          <span className={`v${depasse ? ' alerte' : ''}`}>
            {enSemaine ? formatEuro(paye) : '—'}
          </span>
        </div>
        {max !== undefined && (
          <div className="bud-cell">
            <span className="l">Budget max</span>
            <span className="v">{formatEuro(max)}</span>
          </div>
        )}
      </div>
      {maxConnu && (
        <div className="bud-foot">
          <div className={`bud-bar${depasse ? ' alerte' : ''}`}>
            <i style={{ width: depasse ? '100%' : `${Math.min(pct!, 100)}%` }} />
          </div>
          <span className={`bud-pct${depasse ? ' alerte' : ''}`}>
            {depasse ? `dépassé de ${pct! - 100} %` : `${pct} % du budget`}
          </span>
        </div>
      )}
      <div className="bud-actions">
        <button type="button" className="bsoft" onClick={() => onOuvrirDepenses(true)}>
          <Icon name="plus" size={13} /> Total payé
        </button>
        <button type="button" className="blink" onClick={() => onOuvrirDepenses(false)}>
          Voir mes dépenses réelles
        </button>
      </div>
    </section>
  );
}
