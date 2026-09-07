import type { WeekMeta } from '../lib/model';
import { formatDayMonth } from '../lib/dates';
import { ImportButton } from './ImportButton';

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
