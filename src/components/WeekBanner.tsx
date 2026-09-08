import type { WeekMeta } from '../lib/model';
import { formatDayMonth } from '../lib/dates';

export function WeekBanner({ meta, onOpenProfile }: { meta: WeekMeta; onOpenProfile?: () => void }) {
  return (
    <header className="week-banner">
      <div>
        <div className="week-title-row">
          <h1 className="week-title">Semaine {meta.semaine}</h1>
          <span className="menu-pill">Menu {meta.menu}</span>
        </div>
        {meta.titre && <p className="muted">{meta.titre}</p>}
        <p>
          {formatDayMonth(meta.du)} → {formatDayMonth(meta.au)}
        </p>
      </div>
      {onOpenProfile && (
        <button type="button" className="profile-icon-btn" aria-label="Mon profil" onClick={onOpenProfile}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
          </svg>
        </button>
      )}
    </header>
  );
}
