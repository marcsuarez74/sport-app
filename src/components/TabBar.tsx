import { Icon } from './Icon';

export type TabId = 'cuisine' | 'suivi';

const TABS: Array<{ id: TabId; label: string; icone: 'cart' | 'target' }> = [
  { id: 'cuisine', label: 'Cuisine', icone: 'cart' },
  { id: 'suivi', label: 'Mon suivi', icone: 'target' },
];

// Nav segmented sous la bannière (plus de dock flottant) : pilule glissante
// pilotée en CSS via data-active ; icône + label toujours visibles.
export function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="tabbar-segmented" data-active={active} aria-label="Navigation principale">
      {TABS.map(({ id, label, icone }) => {
        const actif = id === active;
        return (
          <button
            key={id}
            type="button"
            className={actif ? 'seg-tab seg-tab-active' : 'seg-tab'}
            aria-current={actif ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon name={icone} size={18} />
            <span className="seg-tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
