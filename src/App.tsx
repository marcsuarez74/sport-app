import { useCallback, useState } from 'react';
import { ImportScreen } from './components/ImportScreen';
import { ProfileView } from './components/ProfileView';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { WeekBanner } from './components/WeekBanner';
import { CuisineView } from './components/cuisine/CuisineView';
import type { ImportedWeek } from './lib/model';
import { loadWeek } from './lib/storage';

function App() {
  const [week, setWeek] = useState<ImportedWeek | null>(() => loadWeek());
  const [tab, setTab] = useState<TabId>('cuisine');
  const refresh = useCallback(() => setWeek(loadWeek()), []);

  if (!week) return <ImportScreen onImported={refresh} />;

  return (
    <div className="main-content">
      <WeekBanner meta={week.data.meta} onImported={refresh} />
      <TabBar active={tab} onSelect={setTab} />
      <main>
        {tab === 'cuisine' && <CuisineView data={week.data} />}
        {tab === 'marc' && (
          <ProfileView
            profileKey="marc"
            data={week.data.profiles.marc}
            semaine={week.data.meta.semaine}
          />
        )}
        {tab === 'melanie' && (
          <ProfileView
            profileKey="melanie"
            data={week.data.profiles.melanie}
            semaine={week.data.meta.semaine}
          />
        )}
      </main>
    </div>
  );
}

export default App;
