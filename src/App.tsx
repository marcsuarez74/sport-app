import { useState } from 'react';
import { ProfilScreen } from './components/ProfilScreen';
import { ProfileView } from './components/ProfileView';
import { StatCards } from './components/StatCards';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { WeekBanner } from './components/WeekBanner';
import { CuisineView } from './components/cuisine/CuisineView';
import { PRENOMS } from './lib/model';
import type { ImportedWeek, UserProfile } from './lib/model';
import { parseWeeklyFile } from './lib/parse';
import { loadProfile, loadWeeks, removeProfile } from './lib/storage';
import { indexSemaineCourante, semainesTriees } from './lib/weeks';
import { todayISO } from './lib/dates';
import sampleRaw from './assets/semaine-exemple.md?raw';

// Fallback en mémoire : tant qu'aucune semaine n'a été importée, on affiche
// la semaine d'exemple (les semaines réelles arrivent par l'import du cycle).
const semaineExemple = (): ImportedWeek => {
  const { data } = parseWeeklyFile(sampleRaw);
  return { raw: sampleRaw, data, importedAt: '' };
};

const semainesInitiales = (): ImportedWeek[] => {
  const stockees = semainesTriees(Object.values(loadWeeks()));
  return stockees.length ? stockees : [semaineExemple()];
};

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [semaines, setSemaines] = useState<ImportedWeek[]>(semainesInitiales);
  // Navigation en session : null = auto (semaine du jour) ; sinon l'id de la
  // semaine consultée via les chevrons. Rien n'est persisté.
  const [selection, setSelection] = useState<string | null>(null);
  const [profilOuvert, setProfilOuvert] = useState(false);
  // StatCards lit le storage au montage : onWeightsChanged (pesée ajoutée) incrémente
  // weightsBump pour remonter StatCards et relire les pesées.
  const [weightsBump, setWeightsBump] = useState(0);
  const [tab, setTab] = useState<TabId>('cuisine');

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
          onImported={() => {
            setSemaines(semainesInitiales());
            setSelection(null);
            setProfilOuvert(false);
          }}
        />
      </div>
    );
  }

  const idx = indexSemaineCourante(semaines, todayISO());
  const navigable = semaines.length > 1;
  const selectionIdx =
    selection != null
      ? Math.max(0, semaines.findIndex((w) => w.data.meta.semaine === selection))
      : idx;
  const idxAffiche = Math.min(Math.max(selectionIdx, 0), semaines.length - 1);
  const affichee = semaines[idxAffiche];
  if (!affichee) return null;

  return (
    <div className="main-content">
      <WeekBanner
        meta={affichee.data.meta}
        onOpenProfile={() => setProfilOuvert(true)}
        onPrev={
          navigable
            ? () => setSelection(semaines[Math.max(0, idxAffiche - 1)].data.meta.semaine)
            : undefined
        }
        onNext={
          navigable
            ? () =>
                setSelection(
                  semaines[Math.min(semaines.length - 1, idxAffiche + 1)].data.meta.semaine,
                )
            : undefined
        }
        hasPrev={navigable && idxAffiche > 0}
        hasNext={navigable && idxAffiche < semaines.length - 1}
      />
      <TabBar active={tab} onSelect={setTab} />
      <main>
        {tab === 'cuisine' && <CuisineView data={affichee.data} />}
        {tab === 'suivi' && (
          <>
            <p className="greeting">Salut {PRENOMS[profile.id]} 👋</p>
            <StatCards key={weightsBump} data={affichee.data} profile={profile} />
            <ProfileView
              profile={profile}
              data={affichee.data.profiles[profile.id]}
              semaine={affichee.data.meta.semaine}
              onWeightsChanged={() => setWeightsBump((b) => b + 1)}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
