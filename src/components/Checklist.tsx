import { useState } from 'react';
import type { ChecklistItem } from '../lib/model';
import { getChecks, setCheck } from '../lib/storage';

export function Checklist({ items, semaine }: { items: ChecklistItem[]; semaine: string }) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }
  const toggle = (item: ChecklistItem) => {
    const done = !checks[item.id];
    setCheck(semaine, item.id, done);
    setChecks((c) => ({ ...c, [item.id]: done }));
  };
  return (
    <ul className="checklist">
      {items.map((it) => (
        <li key={it.id}>
          <label className={checks[it.id] ? 'done' : ''}>
            <input type="checkbox" checked={!!checks[it.id]} onChange={() => toggle(it)} />
            <span>{it.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
