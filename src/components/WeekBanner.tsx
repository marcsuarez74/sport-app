import type { WeekMeta } from '../lib/model';
import { ImportButton } from './ImportButton';

// '2026-09-21' -> '21/09' : un simple split évite le parsing UTC de new Date.
const formatDayMonth = (iso: string): string => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

export function WeekBanner({ meta, onImported }: { meta: WeekMeta; onImported: () => void }) {
  return (
    <header className="week-banner">
      <div>
        <p className="week-title">Semaine {meta.semaine}</p>
        <p>Menu {meta.menu}</p>
        {meta.titre && <p className="muted">{meta.titre}</p>}
        <p>
          {formatDayMonth(meta.du)} → {formatDayMonth(meta.au)}
        </p>
      </div>
      <ImportButton onImported={onImported} label="Changer de semaine" />
    </header>
  );
}
