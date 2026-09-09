import { useState } from 'react';
import type { UserProfile, WeeklyData } from '../lib/model';
import { todayKey } from '../lib/dates';
import { getChecks, getWeights } from '../lib/storage';
import { compteChecklist, kcalDuJour, poidsActuel, variationPoids7j } from '../lib/stats';

export function StatCards({ data, profile }: { data: WeeklyData; profile: UserProfile }) {
  const [weights] = useState(() => getWeights(profile.id));
  const checks = getChecks(data.meta.semaine);

  const actuel = poidsActuel(weights);
  const variation = variationPoids7j(weights);
  const jour = data.menu.find((d) => d.jour.trim().toLowerCase() === todayKey());
  const kcal = kcalDuJour(jour, data.recettes ?? [], profile.id);
  const seances = compteChecklist(checks, data.profiles[profile.id].seances);
  const courses = compteChecklist(checks, data.courses);
  const coursesRestantes = courses.total - courses.faites;

  // La variation est « bonne » si elle va dans le sens de l'objectif.
  let deltaClass = 'stat-delta-neutre';
  let deltaTexte: string | null = null;
  if (actuel && variation != null) {
    const pct = variation.toFixed(1).replace('.', ',');
    const fleche = variation < 0 ? '▼' : '▲';
    deltaTexte = `${fleche} ${variation < 0 ? '' : '+'}${pct} % vs 7 j`;
    if (profile.poidsObjectif != null) {
      const perte = profile.poidsObjectif < actuel.kg;
      deltaClass = (variation < 0) === perte ? 'stat-delta-bon' : 'stat-delta-alerte';
    }
  }

  return (
    <div className="stat-cards" role="list" aria-label="Résumé de mon suivi">
      <div className="stat-card" role="listitem" aria-label="Poids">
        <span className="stat-label">Poids</span>
        <span className="stat-value">
          {actuel ? `${actuel.kg.toFixed(1).replace('.', ',')}` : '—'}
          {actuel && <small> kg</small>}
        </span>
        {deltaTexte && <span className={`stat-delta ${deltaClass}`}>{deltaTexte}</span>}
      </div>
      <div className="stat-card" role="listitem" aria-label="Kcal du jour">
        <span className="stat-label">Kcal du jour</span>
        <span className="stat-value">
          {kcal != null ? kcal.toLocaleString('fr-FR') : '—'}
          {kcal != null && <small> kcal</small>}
        </span>
        {profile.kcalObjectif != null && (
          <span className="stat-delta stat-delta-neutre">
            objectif {profile.kcalObjectif.toLocaleString('fr-FR')}
          </span>
        )}
      </div>
      <div className="stat-card" role="listitem" aria-label="Séances">
        <span className="stat-label">Séances</span>
        <span className="stat-value">
          {seances.faites}
          <small>/{seances.total}</small>
        </span>
        <span className="stat-bar" aria-hidden="true">
          <span
            className="stat-bar-fill stat-bar-accent"
            style={{ width: seances.total ? `${(seances.faites / seances.total) * 100}%` : '0%' }}
          />
        </span>
      </div>
      <div className="stat-card" role="listitem" aria-label="Courses">
        <span className="stat-label">Courses</span>
        <span className="stat-value">
          {coursesRestantes}
          <small> restantes</small>
        </span>
        <span className="stat-bar" aria-hidden="true">
          <span
            className="stat-bar-fill stat-bar-lime"
            style={{ width: courses.total ? `${(courses.faites / courses.total) * 100}%` : '0%' }}
          />
        </span>
      </div>
    </div>
  );
}
