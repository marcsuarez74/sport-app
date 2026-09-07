import { useCallback, useState } from 'react';
import { ImportScreen } from './components/ImportScreen';
import { ProfileView } from './components/ProfileView';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { WeekBanner } from './components/WeekBanner';
import { CuisineView } from './components/cuisine/CuisineView';
import { PRENOMS } from './lib/model';
import type { ImportedWeek, UserProfile } from './lib/model';
import { loadProfile, loadWeek } from './lib/storage';

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [week, setWeek] = useState<ImportedWeek | null>(() => loadWeek());
  const [tab, setTab] = useState<TabId>('cuisine');
  const refresh = useCallback(() => setWeek(loadWeek()), []);

  if (profile) {
    document.documentElement.dataset.profile = profile.id;
  } else {
    delete document.documentElement.dataset.profile;
  }

  if (!profile) return <Onboarding onDone={setProfile} />;

  if (!week) return <ImportScreen onImported={refresh} />;

  return (
    <div className="main-content">
      <WeekBanner meta={week.data.meta} onImported={refresh} />
      <TabBar active={tab} onSelect={setTab} />
      <main>
        {tab === 'cuisine' && <CuisineView data={week.data} />}
        {tab === 'suivi' && (
          <>
            <p className="greeting">Salut {PRENOMS[profile.id]} 👋</p>
            <ProfileView
              profileKey={profile.id}
              data={week.data.profiles[profile.id]}
              semaine={week.data.meta.semaine}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
