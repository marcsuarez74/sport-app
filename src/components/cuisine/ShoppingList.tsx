import { useMemo, useState } from 'react';
import type { CourseItem } from '../../lib/model';
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
      {groups.map(({ rayon, items: groupItems }) => (
        <section className="course-group" key={rayon}>
          <h3>{capitalize(rayon)}</h3>
          <Checklist
            items={groupItems}
            semaine={semaine}
            onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
          />
        </section>
      ))}
    </div>
  );
}
