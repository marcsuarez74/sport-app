import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ChecklistItem } from '../lib/model';
import { getChecks, setCheck } from '../lib/storage';

export function Checklist<T extends ChecklistItem>({
  items,
  semaine,
  className,
  onChecksChange,
  renderLabel,
}: {
  items: T[];
  semaine: string;
  className?: string;
  onChecksChange?: (checks: Record<string, boolean>) => void;
  renderLabel?: (item: T) => ReactNode;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }
  const toggle = (item: ChecklistItem) => {
    const done = !checks[item.id];
    setCheck(semaine, item.id, done);
    const next = { ...checks, [item.id]: done };
    setChecks(next);
    onChecksChange?.({ [item.id]: done });
  };
  return (
    <ul className={className ? `checklist ${className}` : 'checklist'}>
      {items.map((it) => (
        <li key={it.id}>
          <label className={checks[it.id] ? 'done' : ''}>
            <input type="checkbox" checked={!!checks[it.id]} onChange={() => toggle(it)} />
            {renderLabel ? renderLabel(it) : <span>{it.label}</span>}
          </label>
        </li>
      ))}
    </ul>
  );
}
