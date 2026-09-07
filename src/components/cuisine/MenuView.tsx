import type { MenuDay } from '../../lib/model';
import { todayKey } from '../../lib/dates';

const ROWS: Array<[keyof MenuDay, string]> = [
  ['dejeunerMarc', 'Déjeuner Marc'],
  ['dejeunerMelanie', 'Déjeuner Mélanie'],
  ['dinerFamille', 'Dîner famille'],
  ['dinerMelanie', 'Assiette keto Mé'],
  ['batch', 'Batch du jour'],
];

export function MenuView({ menu }: { menu: MenuDay[] }) {
  if (menu.length === 0) {
    return <p className="muted">Aucun menu pour cette semaine.</p>;
  }

  const today = todayKey();
  return (
    <>
      {menu.map((day) => {
        const isToday = day.jour.trim().toLowerCase() === today;
        return (
          <section className={isToday ? 'menu-day today' : 'menu-day'} key={day.jour}>
            <div className="menu-day-head">
              <h3>{day.jour}</h3>
              {isToday && <span className="today-badge">Aujourd'hui</span>}
            </div>
            {ROWS.map(([key, label]) => {
              const value = day[key];
              if (!value) return null;
              return (
                <p className="menu-row" key={key}>
                  <strong className="menu-row-label">{label}</strong> {value}
                </p>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
