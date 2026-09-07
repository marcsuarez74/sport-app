import { useState } from 'react';
import { ProfilScreen } from './components/ProfilScreen';
import { ProfileView } from './components/ProfileView';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { WeekBanner } from './components/WeekBanner';
import { CuisineView } from './components/cuisine/CuisineView';
import { PRENOMS } from './lib/model';
import type { ImportedWeek, UserProfile } from './lib/model';
import { parseWeeklyFile } from './lib/parse';
import { loadProfile, loadWeek, removeProfile } from './lib/storage';
import sampleRaw from './assets/semaine-exemple.md?raw';

// Fallback en mémoire : tant qu'aucune semaine n'a été enregistrée, on affiche
// la semaine d'exemple (l'import .md reviendra avec la convention template).
const semaineExemple = (): ImportedWeek => {
  const { data } = parseWeeklyFile(sampleRaw);
  return { raw: sampleRaw, data, importedAt: '' };
};

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [week] = useState<ImportedWeek>(() => loadWeek() ?? semaineExemple());
  const [tab, setTab] = useState<TabId>('cuisine');
  const [profilOuvert, setProfilOuvert] = useState(false);

  if (profile) {
    document.documentElement.dataset.profile = profile.id;
  } else {
    delete document.documentElement.dataset.profile;
  }

  if (!profile) return <Onboarding onDone={setProfile} />;

  if (profilOuvert) {
    return (
      <div className="main-content">
        <ProfilScreen
          profile={profile}
          onBack={() => setProfilOuvert(false)}
          onChangeProfile={() => {
            removeProfile();
            setProfile(null);
            setProfilOuvert(false);
          }}
          onProfileSaved={setProfile}
        />
      </div>
    );
  }

  return (
    <div className="main-content">
      <WeekBanner meta={week.data.meta} onOpenProfile={() => setProfilOuvert(true)} />
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
