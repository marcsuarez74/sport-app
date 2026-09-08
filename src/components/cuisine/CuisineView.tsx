import { useState } from 'react';
import type { WeeklyData } from '../../lib/model';
import { BatchView } from './BatchView';
import { MenuView } from './MenuView';
import { ShoppingList } from './ShoppingList';

type CuisineTab = 'courses' | 'menu' | 'batch';

const TABS: Array<{ id: CuisineTab; label: string }> = [
  { id: 'courses', label: '🛒 Courses' },
  { id: 'menu', label: '📅 Menu' },
  { id: 'batch', label: '📦 Batch' },
];

export function CuisineView({ data }: { data: WeeklyData }) {
  const [tab, setTab] = useState<CuisineTab>('courses');
  const semaine = data.meta.semaine;
  return (
    <>
      <nav className="cuisine-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={id === tab ? 'tab active' : 'tab'}
            aria-current={id === tab ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'courses' && <ShoppingList items={data.courses} semaine={semaine} />}
      {tab === 'menu' && (
        <MenuView menu={data.menu} recettes={data.recettes} bases={data.bases} />
      )}
      {tab === 'batch' && (
        <BatchView items={data.batch} rituel={data.rituel} microBatch={data.microBatch} semaine={semaine} />
      )}
    </>
  );
}
