import { Fragment, useState } from 'react';
import type { BaseCuisine, MealKey, MenuDay, Recette } from '../../lib/model';
import { trouverJourDuJour } from '../../lib/stats';

const MEALS: Array<[MealKey, string, string]> = [
  ['dejeunerMarc', 'Marc', 'tag-marc'],
  ['dejeunerMelanie', 'Mé', 'tag-keto'],
  ['dinerFamille', 'Famille', 'tag-fam'],
  ['dinerMelanie', 'Mé', 'tag-keto'],
  ['batch', 'Batch', 'tag-bat'],
];

function trouverRecette(ref: string, recettes: Recette[]): Recette | undefined {
  const cible = ref.toLowerCase();
  // égalité exacte d'abord, puis préfixe borné (`r1` ne doit pas matcher `r10-…`)
  return recettes.find((r) => r.id === cible) ?? recettes.find((r) => r.id.startsWith(cible + '-'));
}

function ordreDepuisAujourdhui(menu: MenuDay[]): { ordered: MenuDay[]; nbPasse: number } {
  const jourCourant = trouverJourDuJour(menu);
  const idx = jourCourant ? menu.indexOf(jourCourant) : -1;
  if (idx <= 0) return { ordered: menu, nbPasse: 0 };
  return { ordered: [...menu.slice(idx), ...menu.slice(0, idx)], nbPasse: idx };
}

export function MenuView({
  menu,
  recettes = [],
  bases = [],
}: {
  menu: MenuDay[];
  recettes?: Recette[];
  bases?: BaseCuisine[];
}) {
  if (menu.length === 0) {
    return <p className="muted">Aucun menu pour cette semaine.</p>;
  }

  const { ordered, nbPasse } = ordreDepuisAujourdhui(menu);
  const pastFrom = ordered.length - nbPasse;

  const jourDuJour = trouverJourDuJour(menu);

  return (
    <>
      {ordered.map((day, i) => {
        const isToday = i === 0 && nbPasse < ordered.length && day === jourDuJour;
        const isPast = i >= pastFrom;
        const recetteParRepas = new Map<MealKey, Recette>();
        for (const [key] of MEALS) {
          const ref = day.recetteRefs?.[key];
          const recette = ref ? trouverRecette(ref, recettes) : undefined;
          if (recette) recetteParRepas.set(key, recette);
        }
        return (
          <section
            className={isToday ? 'menu-day today' : isPast ? 'menu-day past' : 'menu-day'}
            key={day.jour}
          >
            <div className="menu-day-head">
              <h3>{day.jour}</h3>
              {isToday && <span className="today-badge">Aujourd'hui</span>}
              {isPast && <span className="past-badge">Passé</span>}
            </div>
            {MEALS.map(([key, label, tag]) => {
              const value = day[key];
              if (!value) return null;
              const recette = recetteParRepas.get(key);
              return (
                <Fragment key={key}>
                  <div className="menu-row">
                    <span className={`menu-tag ${tag}`}>{label}</span>
                    <span className="menu-row-text">{value}</span>
                  </div>
                  {recette && <RecetteCard recette={recette} bases={bases} mealLabel={label} />}
                </Fragment>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

export function RecetteCard({
  recette,
  bases,
  mealLabel,
}: {
  recette: Recette;
  bases?: BaseCuisine[];
  mealLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [baseOuverte, setBaseOuverte] = useState<string | null>(null);
  const tempsCourt = recette.temps?.split('·')[0]?.trim();
  const aMacros =
    recette.kcal != null ||
    recette.proteines != null ||
    recette.glucides != null ||
    recette.lipides != null;
  return (
    <article className="recette-card" aria-label={recette.nom}>
      <div className="recette-top">
        {recette.image ? (
          <img className="recette-thumb" src={recette.image} alt={recette.nom} loading="lazy" />
        ) : (
          <div className="recette-fallback" data-testid="recette-fallback" aria-hidden="true">
            🍳
          </div>
        )}
        <div className="recette-main">
          <div className="recette-nom">{recette.nom}</div>
          <button
            type="button"
            className="recette-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Réduire ⌃' : 'Voir la recette ⌄'}
          </button>
        </div>
      </div>
      <div className="recette-badges">
        {mealLabel && <span className="recette-badge-cat">{mealLabel}</span>}
        {tempsCourt && <span className="recette-badge-info">⏱ {tempsCourt}</span>}
        {recette.score != null && (
          <div className="recette-score">
            <div className="recette-score-head">
              <span className="stat-label">Health score :</span>
              <span className="recette-score-value">
                {recette.score}
                <small>/10</small>
              </span>
            </div>
            <div className="score-bar" data-testid="score-bar" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < recette.score! ? 'score-seg on' : 'score-seg'} />
              ))}
            </div>
          </div>
        )}
      </div>
      {aMacros && (
        <div className="recette-nutri">
          {recette.kcal != null && <span>🔥 {recette.kcal} kcal</span>}
          {recette.glucides != null && <span>🌾 {recette.glucides}g C</span>}
          {recette.proteines != null && <span>💪 {recette.proteines}g P</span>}
          {recette.lipides != null && <span>💧 {recette.lipides}g F</span>}
        </div>
      )}
      {open && (
        <div className="recette-detail">
          {recette.pour && <p className="recette-pour">{recette.pour}</p>}
          {recette.bases && recette.bases.length > 0 && (
            <div className="recette-bases">
              {recette.bases.map((b) => {
                const base = trouverBase(b, bases);
                return base ? (
                  <button
                    type="button"
                    key={base.id}
                    className={baseOuverte === base.id ? 'recette-bchip on' : 'recette-bchip'}
                    aria-expanded={baseOuverte === base.id}
                    onClick={() => setBaseOuverte(baseOuverte === base.id ? null : base.id)}
                  >
                    🧂 {base.nom}
                  </button>
                ) : null;
              })}
            </div>
          )}
          {baseOuverte &&
            bases
              ?.filter((b) => b.id === baseOuverte)
              .map((b) => (
                <p className="recette-bdesc" key={b.id}>
                  🧂 {b.nom} : {b.texte}
                </p>
              ))}
          {recette.etapes && recette.etapes.length > 0 && (
            <ol className="recette-etapes">
              {recette.etapes.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ol>
          )}
          {recette.mel && <p className="recette-ligne recette-mel">{recette.mel}</p>}
          {recette.batch && <p className="recette-ligne recette-bat">{recette.batch}</p>}
        </div>
      )}
    </article>
  );
}

function trouverBase(ref: string, bases: BaseCuisine[] | undefined): BaseCuisine | undefined {
  if (!bases) return undefined;
  const cible = ref.toLowerCase();
  // même discipline que trouverRecette : égalité exacte d'abord, puis préfixe borné (`b4` ne doit pas matcher `b40-…`)
  return bases.find((b) => b.id === cible) ?? bases.find((b) => b.id.startsWith(cible + '-'));
}
