export type TabId = 'cuisine' | 'marc' | 'melanie';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'cuisine', label: '🛒 Cuisine' },
  { id: 'marc', label: '💪 Marc' },
  { id: 'melanie', label: '🥑 Mélanie' },
];

export function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
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
