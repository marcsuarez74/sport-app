import { useMemo, useState } from 'react';
import type { CourseItem } from '../../lib/model';
import { imagePourRayon } from '../../lib/rayons';
import { getChecks } from '../../lib/storage';
import { Checklist } from '../Checklist';

const capitalize = (slug: string): string => (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : slug);

export function ShoppingList({ items, semaine }: { items: CourseItem[]; semaine: string }) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }

  const groups = useMemo(() => {
    const grouped = new Map<string, CourseItem[]>();
    for (const it of items) {
      const list = grouped.get(it.rayon);
      if (list) list.push(it);
      else grouped.set(it.rayon, [it]);
    }
    return [...grouped.entries()].map(([rayon, groupItems]) => ({ rayon, items: groupItems }));
  }, [items]);

  if (items.length === 0) {
    return <p className="muted">Aucune course pour cette semaine.</p>;
  }

  const total = items.length;
  const done = items.reduce((acc, it) => acc + (checks[it.id] ? 1 : 0), 0);
  return (
    <div>
      <p className="progress">
        {done}/{total} cochés
        <progress value={done} max={total} />
      </p>
      {[...groups]
        .sort((a, b) => Number(a.rayon === 'keto') - Number(b.rayon === 'keto'))
        .map(({ rayon, items: groupItems }) => {
          const faits = groupItems.filter((it) => checks[it.id]).length;
          return rayon === 'keto' ? (
            <section className="keto-box" key={rayon}>
              <div className="keto-title">
                <span aria-hidden="true">🟢</span> Les extras keto de Mélanie{' '}
                <span className="rayon-cnt">
                  {faits}/{groupItems.length}
                </span>
              </div>
              <Checklist
                items={groupItems}
                semaine={semaine}
                onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
              />
            </section>
          ) : (
            <section className="course-group" key={rayon}>
              <header className="course-group-header">
                <img
                  src={imagePourRayon(rayon)}
                  alt={capitalize(rayon)}
                  loading="lazy"
                  width={72}
                  height={54}
                />
                <h3>{capitalize(rayon)}</h3>
                <span className="rayon-cnt">
                  {faits}/{groupItems.length}
                </span>
              </header>
              <Checklist
                items={groupItems}
                semaine={semaine}
                onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
              />
            </section>
          );
        })}
    </div>
  );
}
