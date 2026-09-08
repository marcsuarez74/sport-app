import { useState } from 'react';
import type { BaseCuisine, MealKey, MenuDay, Recette } from '../../lib/model';
import { todayKey } from '../../lib/dates';

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
  const t = todayKey();
  const idx = menu.findIndex((d) => d.jour.trim().toLowerCase() === t);
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
  const [openRec, setOpenRec] = useState<string | null>(null);

  if (menu.length === 0) {
    return <p className="muted">Aucun menu pour cette semaine.</p>;
  }

  const { ordered, nbPasse } = ordreDepuisAujourdhui(menu);
  const pastFrom = ordered.length - nbPasse;

  return (
    <>
      {ordered.map((day, i) => {
        const isToday = i === 0 && nbPasse < ordered.length && day.jour.trim().toLowerCase() === todayKey();
        const isPast = i >= pastFrom;
        const recetteParRepas = new Map<MealKey, Recette>();
        for (const [key] of MEALS) {
          const ref = day.recetteRefs?.[key];
          const recette = ref ? trouverRecette(ref, recettes) : undefined;
          if (recette) recetteParRepas.set(key, recette);
        }
        const ouverte = openRec
          ? [...recetteParRepas.values()].find((r) => r.id === openRec)
          : undefined;
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
                <div className="menu-row" key={key}>
                  <span className={`menu-tag ${tag}`}>{label}</span>
                  <span className="menu-row-text">
                    {value}
                    {recette && (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="menu-recette-link"
                          aria-expanded={openRec === recette.id}
                          onClick={() => setOpenRec(openRec === recette.id ? null : recette.id)}
                        >
                          📖 {recette.nom}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
            {ouverte && <RecetteCard recette={ouverte} bases={bases} onClose={() => setOpenRec(null)} />}
          </section>
        );
      })}
    </>
  );
}

export function RecetteCard({
  recette,
  bases,
  onClose,
}: {
  recette: Recette;
  bases?: BaseCuisine[];
  onClose: () => void;
}) {
  const [baseOuverte, setBaseOuverte] = useState<string | null>(null);
  return (
    <article className="recette-card" aria-label={recette.nom}>
      <header className="recette-head">
        <span className="recette-ico" aria-hidden="true">
          🍳
        </span>
        <div className="recette-title">
          <div className="recette-nom">{recette.nom}</div>
          <div className="recette-meta">
            {recette.temps && <>⏱ {recette.temps}</>}
            {recette.temps && ' · '}
            pour 4
          </div>
        </div>
        <button type="button" className="recette-close" aria-label="Fermer la recette" onClick={onClose}>
          ×
        </button>
      </header>
      {(recette.kcal != null || recette.proteines != null) && (
        <div className="recette-stats">
          {recette.kcal != null && <span>🔥 ~{recette.kcal} kcal /pers</span>}
          {recette.proteines != null && <span>💪 {recette.proteines} g protéines</span>}
        </div>
      )}
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
    </article>
  );
}

function trouverBase(ref: string, bases: BaseCuisine[] | undefined): BaseCuisine | undefined {
  if (!bases) return undefined;
  const cible = ref.toLowerCase();
  return bases.find((b) => b.id === cible || b.id.startsWith(cible));
}
