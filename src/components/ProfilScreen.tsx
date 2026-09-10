import { useState } from 'react';
import { OBJECTIF_TYPES, PRENOMS, REGIMES, normaliseComplement } from '../lib/model';
import type { ObjectifType, Regime, UserProfile } from '../lib/model';
import { ageDepuis, todayISO } from '../lib/dates';
import { saveProfile } from '../lib/storage';
import { ImportButton } from './ImportButton';
import { Icon } from './Icon';

type Section = 'infos' | 'objectif' | 'complements' | 'regime';
type SectionAvecErreur = 'infos' | 'objectif' | 'complements';
type Erreur = { section: SectionAvecErreur; texte: string };

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
  const [objectifType, setObjectifType] = useState<ObjectifType>(profile.objectif.type);
  const [echeance, setEcheance] = useState(profile.objectif.echeance ?? '');
  const [poidsObjectif, setPoidsObjectif] = useState(
    profile.poidsObjectif != null ? String(profile.poidsObjectif) : '',
  );
  const [complements, setComplements] = useState<string[]>([...profile.complements]);
  const [nouveauComplement, setNouveauComplement] = useState('');
  const [regime, setRegime] = useState<Regime>(profile.regime);
  const [savedSection, setSavedSection] = useState<Section | null>(null);
  const [erreur, setErreur] = useState<Erreur | null>(null);

  const maj = (section: Section, updated: UserProfile) => {
    saveProfile(updated);
    onProfileSaved?.(updated);
    setSavedSection(section);
  };

  const clearErreur = (section: SectionAvecErreur) =>
    setErreur((e) => (e?.section === section ? null : e));

  const enregistrerInfos = () => {
    const cm = Number.parseInt(taille, 10);
    if (!dateNaissance || Number.isNaN(cm)) {
      setErreur({ section: 'infos', texte: 'Formulaire incomplet : remplis ta date de naissance et ta taille.' });
      return;
    }
    if (dateNaissance > todayISO()) {
      setErreur({ section: 'infos', texte: 'La date de naissance ne peut pas être dans le futur.' });
      return;
    }
    const ans = ageDepuis(dateNaissance);
    if (ans < 10 || ans > 100) {
      setErreur({ section: 'infos', texte: 'Âge calculé invalide : entre 10 et 100 ans.' });
      return;
    }
    if (cm < 120 || cm > 230) {
      setErreur({ section: 'infos', texte: 'Taille invalide : entre 120 et 230 cm.' });
      return;
    }
    clearErreur('infos');
    maj('infos', { ...profile, dateNaissance, taille: cm });
  };

  const enregistrerObjectif = () => {
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setErreur({ section: 'objectif', texte: 'Poids objectif invalide : entre 30 et 250 kg.' });
      return;
    }
    clearErreur('objectif');
    const updated: UserProfile = {
      ...profile,
      objectif: { type: objectifType, ...(echeance ? { echeance } : {}) },
    };
    delete updated.poidsObjectif;
    if (obj != null) updated.poidsObjectif = obj;
    maj('objectif', updated);
  };

  const enregistrerComplements = () => {
    clearErreur('complements');
    maj('complements', { ...profile, complements: [...complements] });
  };

  const enregistrerRegime = () => maj('regime', { ...profile, regime });

  const ajouterComplement = () => {
    const v = nouveauComplement.trim().slice(0, 40);
    if (!v) return;
    if (complements.some((c) => normaliseComplement(c) === normaliseComplement(v))) {
      setErreur({ section: 'complements', texte: 'Ce complément est déjà sélectionné.' });
      return;
    }
    clearErreur('complements');
    setComplements([...complements, v]);
    setNouveauComplement('');
  };

  const changerProfil = () => {
    if (
      window.confirm(
        `Changer de profil ? ${PRENOMS[profile.id]} restera sur ce téléphone avec ses données.`,
      )
    )
      onChangeProfile();
  };

  const fil = (s: Section) =>
    savedSection === s ? (
      <p className="muted" role="status">
        Enregistré ✓
      </p>
    ) : null;

  const alerte = (s: SectionAvecErreur) =>
    erreur?.section === s ? (
      <p className="error" role="alert">
        {erreur.texte}
      </p>
    ) : null;

  return (
    <div className="profil-screen">
      <button type="button" className="profil-back" onClick={onBack}>
        ← Retour
      </button>
      <h1>Profil</h1>

      <section className="profile-section">
        <h3>Mes infos</h3>
        <div className="onboarding-field">
          <label htmlFor="pf-naissance">Date de naissance</label>
          <input
            id="pf-naissance"
            type="date"
            value={dateNaissance}
            onChange={(e) => {
              setSavedSection(null);
              clearErreur('infos');
              setDateNaissance(e.target.value);
            }}
          />
          <p className="onb-hint">
            {dateNaissance
              ? `${ageDepuis(dateNaissance)} ans — calculé automatiquement.`
              : 'Sélectionne ta date de naissance.'}
          </p>
        </div>
        <div className="onboarding-field">
          <label htmlFor="pf-taille">Taille (cm)</label>
          <input
            id="pf-taille"
            type="number"
            inputMode="numeric"
            value={taille}
            onChange={(e) => {
              setSavedSection(null);
              clearErreur('infos');
              setTaille(e.target.value);
            }}
          />
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerInfos}>
          Enregistrer mes infos
        </button>
        {alerte('infos')}
        {fil('infos')}
      </section>

      <section className="profile-section">
        <h3>Objectif</h3>
        <div className="rline" role="radiogroup" aria-label="Type d'objectif">
          {OBJECTIF_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={objectifType === t.id}
              className={`rl${objectifType === t.id ? ' sel' : ''}`}
              onClick={() => {
                setSavedSection(null);
                clearErreur('objectif');
                setObjectifType(t.id);
              }}
            >
              <span className="rl-dot" aria-hidden="true" />
              {t.nom}
            </button>
          ))}
        </div>
        <div className="onboarding-field">
          <label htmlFor="pf-echeance">Échéance (optionnelle)</label>
          <input
            id="pf-echeance"
            type="date"
            value={echeance}
            onChange={(e) => {
              setSavedSection(null);
              setEcheance(e.target.value);
            }}
          />
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
              setSavedSection(null);
              clearErreur('objectif');
              setPoidsObjectif(e.target.value);
            }}
          />
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerObjectif}>
          Enregistrer l'objectif
        </button>
        {alerte('objectif')}
        {fil('objectif')}
      </section>

      <section className="profile-section">
        <h3>Compléments</h3>
        <div className="chips">
          {complements.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              onClick={() => {
                setSavedSection(null);
                setComplements(complements.filter((x) => x !== c));
              }}
            >
              {c}
              <span className="rm" aria-hidden="true">
                ✕
              </span>
              <span className="sr-only">{`Retirer ${c}`}</span>
            </button>
          ))}
        </div>
        <div className="addrow">
          <input
            value={nouveauComplement}
            maxLength={40}
            placeholder="Ajouter un complément…"
            aria-label="Ajouter un complément"
            onChange={(e) => {
              clearErreur('complements');
              setNouveauComplement(e.target.value);
            }}
          />
          <button type="button" onClick={ajouterComplement}>
            <Icon name="plus" size={13} /> Ajouter
          </button>
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerComplements}>
          Enregistrer les compléments
        </button>
        {alerte('complements')}
        {fil('complements')}
      </section>

      <section className="profile-section">
        <h3>Régime</h3>
        <div className="rline" role="radiogroup" aria-label="Régime">
          {REGIMES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={regime === r.id}
              className={`rl${regime === r.id ? ' sel' : ''}`}
              onClick={() => {
                setSavedSection(null);
                setRegime(r.id);
              }}
            >
              <span className="rl-dot" aria-hidden="true" />
              {r.nom}
            </button>
          ))}
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerRegime}>
          Enregistrer le régime
        </button>
        {fil('regime')}
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
