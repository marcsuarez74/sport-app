export type TabId = 'cuisine' | 'suivi';

const TABS: Array<{ id: TabId; label: string; icone: string }> = [
  { id: 'cuisine', label: 'Cuisine', icone: '🛒' },
  { id: 'suivi', label: 'Mon suivi', icone: '🎯' },
];

// Dock flottant (variante A) : pilule d'accent glissante pilotée en CSS via
// data-active ; l'onglet actif porte son label, l'inactif reste une icône
// seule (aria-label pour le nom).
export function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="tabbar-dock" data-active={active}>
      {TABS.map(({ id, label, icone }) => {
        const actif = id === active;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            className={actif ? 'dock-tab dock-tab-active' : 'dock-tab'}
            aria-current={actif ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <span className="dock-tab-icone" aria-hidden="true">
              {icone}
            </span>
            {actif && <span className="dock-tab-label">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
