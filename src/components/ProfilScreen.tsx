import { useState } from 'react';
import type { UserProfile } from '../lib/model';
import { PRENOMS } from '../lib/model';
import { ageDepuis, todayISO } from '../lib/dates';
import { saveProfile } from '../lib/storage';
import { ImportButton } from './ImportButton';

export function ProfilScreen({
  profile,
  onBack,
  onChangeProfile,
  onProfileSaved,
  onImported,
}: {
  profile: UserProfile;
  onBack: () => void;
  onChangeProfile: () => void;
  onProfileSaved?: (p: UserProfile) => void;
  onImported: () => void;
}) {
  const [dateNaissance, setDateNaissance] = useState(profile.dateNaissance);
  const [taille, setTaille] = useState(String(profile.taille));
  const [poidsObjectif, setPoidsObjectif] = useState(
    profile.poidsObjectif != null ? String(profile.poidsObjectif) : '',
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enregistrer = () => {
    const cm = Number.parseInt(taille, 10);
    if (!dateNaissance || Number.isNaN(cm)) {
      setError('Formulaire incomplet : remplis ta date de naissance et ta taille.');
      return;
    }
    if (dateNaissance > todayISO()) {
      setError('La date de naissance ne peut pas être dans le futur.');
      return;
    }
    const ans = ageDepuis(dateNaissance);
    if (ans < 10 || ans > 100) {
      setError('Âge calculé invalide : entre 10 et 100 ans.');
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
    // Le spread préserve objectif/complements/régime (sections dédiées en Task 6) ;
    // poidsObjectif est retiré si le champ est vidé.
    const updated: UserProfile = { ...profile, dateNaissance, taille: cm };
    delete updated.poidsObjectif;
    if (obj != null) updated.poidsObjectif = obj;
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
            <label htmlFor="pf-naissance">Date de naissance</label>
            <input
              id="pf-naissance"
              type="date"
              value={dateNaissance}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setDateNaissance(e.target.value);
              }}
            />
            <p className="onb-hint">{`${ageDepuis(dateNaissance)} ans — calculé automatiquement.`}</p>
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
        <div className="onboarding-field">
          <label htmlFor="pf-obj-poids">Poids objectif (kg)</label>
          <input
            id="pf-obj-poids"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={poidsObjectif}
            onChange={(e) => {
              setSaved(false);
              setError(null);
              setPoidsObjectif(e.target.value);
            }}
          />
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
        <h3>Semaine</h3>
        <ImportButton onImported={onImported} label="Importer un cycle (.md)" />
      </section>

      <section className="profile-section">
        <h3>Compte</h3>
        <button type="button" className="profil-switch" onClick={changerProfil}>
          Changer de profil
        </button>
      </section>

      <p className="muted profil-about">
        Rituel v{__APP_VERSION__} — vos données restent sur votre téléphone.
      </p>
    </div>
  );
}
