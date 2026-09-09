import { useState } from 'react';
import type { ProfileKey, UserProfile } from '../../lib/model';
import { todayISO } from '../../lib/dates';
import { addWeight, saveProfile } from '../../lib/storage';

const PROFILS: Array<{ id: ProfileKey; prenom: string; emoji: string; tagline: string }> = [
  { id: 'marc', prenom: 'Marc', emoji: '💪', tagline: 'Diet & sport' },
  { id: 'melanie', prenom: 'Mélanie', emoji: '🌿', tagline: 'Keto & sport' },
];

export function Onboarding({ onDone }: { onDone: (profile: UserProfile) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [id, setId] = useState<ProfileKey | null>(null);
  const [poids, setPoids] = useState('');
  const [age, setAge] = useState('');
  const [taille, setTaille] = useState('');
  const [poidsObjectif, setPoidsObjectif] = useState('');
  const [kcalObjectif, setKcalObjectif] = useState('');
  const [error, setError] = useState<string | null>(null);

  const choisir = (p: ProfileKey) => {
    setId(p);
    setError(null);
    setStep(2);
  };

  const retour = () => {
    setError(null);
    setStep(1);
  };

  const valider = () => {
    const kg = Number.parseFloat(poids.replace(',', '.'));
    const ans = Number.parseInt(age, 10);
    const cm = Number.parseInt(taille, 10);
    if (!poids || !age || !taille || Number.isNaN(kg) || Number.isNaN(ans) || Number.isNaN(cm)) {
      setError('Formulaire incomplet : remplis ton poids, ton âge et ta taille.');
      return;
    }
    if (kg < 30 || kg > 250) {
      setError('Poids invalide : entre 30 et 250 kg.');
      return;
    }
    if (ans < 10 || ans > 100) {
      setError('Âge invalide : entre 10 et 100 ans.');
      return;
    }
    if (cm < 120 || cm > 230) {
      setError('Taille invalide : entre 120 et 230 cm.');
      return;
    }
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    const kcalObj = kcalObjectif ? Number.parseInt(kcalObjectif, 10) : undefined;
    if (kcalObjectif && (kcalObj === undefined || kcalObj < 800 || kcalObj > 6000)) {
      setError('Objectif kcal invalide : entre 800 et 6000.');
      return;
    }
    if (!id) return;
    const profile: UserProfile = {
      id,
      age: ans,
      taille: cm,
      ...(obj != null ? { poidsObjectif: obj } : {}),
      ...(kcalObj != null ? { kcalObjectif: kcalObj } : {}),
    };
    saveProfile(profile);
    addWeight(id, todayISO(), kg);
    onDone(profile);
  };

  return (
    <div className="onboarding" data-profile={id ?? undefined}>
      <div className="onboarding-dots" role="group" aria-label="Progression de l'onboarding">
        <span className={step === 1 ? 'onboarding-dot-active' : undefined} />
        <span className={step === 2 ? 'onboarding-dot-active' : undefined} />
      </div>

      {step === 1 ? (
        <>
          <h1>Qui est derrière l'écran ?</h1>
          <p className="onboarding-sub">Choisis ton profil, on s'occupe du reste.</p>
          <div className="onboarding-cards">
            {PROFILS.map(({ id: pid, prenom, emoji, tagline }) => (
              <button key={pid} type="button" className={`onboarding-card onboarding-card-${pid}`} onClick={() => choisir(pid)}>
                <span className="onboarding-card-emoji" aria-hidden="true">
                  {emoji}
                </span>
                <span className="onboarding-card-prenom">{prenom}</span>
                <span className="onboarding-card-tagline">{tagline}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1>
            Salut {PROFILS.find((p) => p.id === id)?.prenom} 👋
          </h1>
          <p className="onboarding-sub">Tes bases, pour tes suivis.</p>
          <form
            className="onboarding-form"
            onSubmit={(e) => {
              e.preventDefault();
              valider();
            }}
          >
            <div className="onboarding-field">
              <label htmlFor="ob-poids">Poids (kg)</label>
              <input
                id="ob-poids"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={poids}
                onChange={(e) => {
                  setError(null);
                  setPoids(e.target.value);
                }}
              />
            </div>
            <div className="onboarding-row">
              <div className="onboarding-field">
                <label htmlFor="ob-age">Âge</label>
                <input
                  id="ob-age"
                  type="number"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => {
                    setError(null);
                    setAge(e.target.value);
                  }}
                />
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-taille">Taille (cm)</label>
                <input
                  id="ob-taille"
                  type="number"
                  inputMode="numeric"
                  value={taille}
                  onChange={(e) => {
                    setError(null);
                    setTaille(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="onboarding-row">
              <div className="onboarding-field">
                <label htmlFor="ob-obj-poids">Poids objectif (kg)</label>
                <input
                  id="ob-obj-poids"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={poidsObjectif}
                  onChange={(e) => {
                    setError(null);
                    setPoidsObjectif(e.target.value);
                  }}
                />
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-obj-kcal">Objectif kcal/jour</label>
                <input
                  id="ob-obj-kcal"
                  type="number"
                  inputMode="numeric"
                  value={kcalObjectif}
                  onChange={(e) => {
                    setError(null);
                    setKcalObjectif(e.target.value);
                  }}
                />
              </div>
            </div>
            <button type="submit" className="onboarding-cta">
              C'est parti ! 🚀
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="onboarding-back" onClick={retour}>
              ← Retour
            </button>
          </form>
        </>
      )}
    </div>
  );
}
