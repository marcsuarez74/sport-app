import { useState } from 'react';
import type { UserProfile } from '../lib/model';
import { PRENOMS } from '../lib/model';
import { saveProfile } from '../lib/storage';

export function ProfilScreen({
  profile,
  onBack,
  onChangeProfile,
  onProfileSaved,
}: {
  profile: UserProfile;
  onBack: () => void;
  onChangeProfile: () => void;
  onProfileSaved?: (p: UserProfile) => void;
}) {
  const [age, setAge] = useState(String(profile.age));
  const [taille, setTaille] = useState(String(profile.taille));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enregistrer = () => {
    const ans = Number.parseInt(age, 10);
    const cm = Number.parseInt(taille, 10);
    if (Number.isNaN(ans) || Number.isNaN(cm)) {
      setError('Formulaire incomplet : remplis ton âge et ta taille.');
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
    const updated: UserProfile = { id: profile.id, age: ans, taille: cm };
    saveProfile(updated);
    onProfileSaved?.(updated);
    setSaved(true);
  };

  const changerProfil = () => {
    if (
      window.confirm(
        `Changer de profil ? ${PRENOMS[profile.id]} restera sur ce téléphone avec ses données.`,
      )
    )
      onChangeProfile();
  };

  return (
    <div className="profil-screen">
      <button type="button" className="profil-back" onClick={onBack}>
        ← Retour
      </button>
      <h1>Profil</h1>

      <section className="profile-section">
        <h3>Mes infos</h3>
        <div className="onboarding-row">
          <div className="onboarding-field">
            <label htmlFor="pf-age">Âge</label>
            <input
              id="pf-age"
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setAge(e.target.value);
              }}
            />
          </div>
          <div className="onboarding-field">
            <label htmlFor="pf-taille">Taille (cm)</label>
            <input
              id="pf-taille"
              type="number"
              inputMode="numeric"
              value={taille}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setTaille(e.target.value);
              }}
            />
          </div>
        </div>
        <button type="button" className="btn" onClick={enregistrer}>
          Enregistrer
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="muted" role="status">
            Infos enregistrées ✓
          </p>
        )}
      </section>

      <section className="profile-section">
        <h3>Compte</h3>
        <button type="button" className="profil-switch" onClick={changerProfil}>
          Changer de profil
        </button>
      </section>

      <p className="muted profil-about">Sport App — vos données restent sur votre téléphone.</p>
    </div>
  );
}
