export type TabId = 'cuisine' | 'suivi';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'cuisine', label: '🛒 Cuisine' },
  { id: 'suivi', label: '🎯 Mon suivi' },
];

export function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          data-tab={id}
          className={id === active ? 'tab active' : 'tab'}
          aria-current={id === active ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
