import { useState } from 'react';
import {
  COMPLEMENTS_PRESETS,
  OBJECTIF_TYPES,
  REGIMES,
  normaliseComplement,
} from '../../lib/model';
import type { ObjectifType, ProfilLegacy, ProfileKey, Regime, UserProfile } from '../../lib/model';
import { ageDepuis, todayISO } from '../../lib/dates';
import { addWeight, getWeights, saveProfile } from '../../lib/storage';
import { Icon } from '../Icon';

const PROFILS: Array<{ id: ProfileKey; prenom: string; emoji: string; tagline: string }> = [
  { id: 'marc', prenom: 'Marc', emoji: '💪', tagline: 'Diet & sport' },
  { id: 'melanie', prenom: 'Mélanie', emoji: '🌿', tagline: 'Keto & sport' },
];

export function Onboarding({
  onDone,
  prefill,
}: {
  onDone: (profile: UserProfile) => void;
  prefill?: ProfilLegacy;
}) {
  // Migration : démarrer directement à l'étape 2, profil verrouillé (pas d'étape 1).
  const [step, setStep] = useState<1 | 2 | 3 | 4>(prefill ? 2 : 1);
  const [id, setId] = useState<ProfileKey | null>(prefill?.id ?? null);
  const [poids, setPoids] = useState(() => {
    if (!prefill) return '';
    const list = getWeights(prefill.id);
    const last = list.length > 0 ? list[list.length - 1] : undefined;
    return last ? String(last.kg) : '';
  });
  const [dateNaissance, setDateNaissance] = useState('');
  const [taille, setTaille] = useState(prefill ? String(prefill.taille) : '');
  const [objectifType, setObjectifType] = useState<ObjectifType>('perte');
  const [echeance, setEcheance] = useState('');
  const [poidsObjectif, setPoidsObjectif] = useState(
    prefill?.poidsObjectif != null ? String(prefill.poidsObjectif) : '',
  );
  const [complements, setComplements] = useState<string[]>([]);
  const [nouveauComplement, setNouveauComplement] = useState('');
  const [regime, setRegime] = useState<Regime>('aucun');
  const [error, setError] = useState<string | null>(null);

  const migration = prefill != null;
  const profil = id ? PROFILS.find((p) => p.id === id) : undefined;

  const aller = (n: 1 | 2 | 3 | 4) => {
    setError(null);
    setStep(n);
  };

  const choisir = (p: ProfileKey) => {
    setId(p);
    aller(2);
  };

  const retour = () => aller(Math.max(1, step - 1) as 1 | 2 | 3 | 4);

  // Valide l'étape 2 et retourne le poids/taille parsés, ou null avec un message.
  // En migration, le poids est optionnel (champ vide si aucune pesée enregistrée —
  // la seule saisie obligatoire est la date de naissance).
  const validerInfos = (): { kg: number | null; cm: number } | null => {
    const kg = poids ? Number.parseFloat(poids.replace(',', '.')) : Number.NaN;
    const cm = Number.parseInt(taille, 10);
    if (
      !dateNaissance ||
      !taille ||
      Number.isNaN(cm) ||
      (!migration && (!poids || Number.isNaN(kg)))
    ) {
      // En migration le poids est optionnel : ne citer que ce qui manque vraiment.
      const manques: string[] = [];
      if (!migration && (!poids || Number.isNaN(kg))) manques.push('ton poids');
      if (!dateNaissance) manques.push('ta date de naissance');
      if (!taille || Number.isNaN(cm)) manques.push('ta taille');
      const liste =
        manques.length > 1
          ? `${manques.slice(0, -1).join(', ')} et ${manques[manques.length - 1]}`
          : manques[0];
      setError(`Formulaire incomplet : remplis ${liste}.`);
      return null;
    }
    if (poids && (Number.isNaN(kg) || kg < 30 || kg > 250)) {
      setError('Poids invalide : entre 30 et 250 kg.');
      return null;
    }
    if (dateNaissance > todayISO()) {
      setError('La date de naissance ne peut pas être dans le futur.');
      return null;
    }
    const ans = ageDepuis(dateNaissance);
    if (ans < 10 || ans > 100) {
      setError('Âge calculé invalide : entre 10 et 100 ans.');
      return null;
    }
    if (cm < 120 || cm > 230) {
      setError('Taille invalide : entre 120 et 230 cm.');
      return null;
    }
    return { kg: poids ? kg : null, cm };
  };

  const continuerInfos = () => {
    if (validerInfos()) aller(3);
  };

  const continuerObjectif = () => {
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    setError(null);
    aller(4);
  };

  const ajouterComplement = () => {
    const v = nouveauComplement.trim().slice(0, 40);
    if (!v) return;
    if (complements.some((c) => normaliseComplement(c) === normaliseComplement(v))) {
      setError('Ce complément est déjà sélectionné.');
      return;
    }
    setError(null);
    setComplements([...complements, v]);
    setNouveauComplement('');
  };

  const basculerPreset = (preset: string) => {
    setError(null);
    setComplements((cs) =>
      cs.some((c) => normaliseComplement(c) === normaliseComplement(preset))
        ? cs.filter((c) => normaliseComplement(c) !== normaliseComplement(preset))
        : [...cs, preset],
    );
  };

  const valider = () => {
    const infos = validerInfos();
    if (!infos) return;
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    if (!id) return;
    const profile: UserProfile = {
      id,
      dateNaissance,
      taille: infos.cm,
      ...(obj != null ? { poidsObjectif: obj } : {}),
      objectif: { type: objectifType, ...(echeance ? { echeance } : {}) },
      complements: [...complements],
      regime,
    };
    saveProfile(profile);
    if (infos.kg != null) addWeight(id, todayISO(), infos.kg);
    onDone(profile);
  };

  return (
    <div className="onboarding">
      {!migration && (
        <div className="onboarding-dots" role="group" aria-label="Progression de l'onboarding">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= step ? 'onboarding-dot-active' : undefined} />
          ))}
        </div>
      )}

      {migration && (
        <p className="onb-note">
          <Icon name="check" size={16} />
          <span>
            <b>Une mise à jour 👋</b> — ton profil existe déjà : on l'a prérempli. Vérifie et
            complète ta <b>date de naissance</b>, c'est tout.
          </span>
        </p>
      )}

      {step === 1 && (
        <>
          <h1>Qui est derrière l'écran ?</h1>
          <p className="onboarding-sub">Choisis ton profil, on s'occupe du reste.</p>
          <div className="onboarding-cards">
            {PROFILS.map(({ id: pid, prenom, emoji, tagline }) => (
              <button
                key={pid}
                type="button"
                className={`onboarding-card onboarding-card-${pid}`}
                onClick={() => choisir(pid)}
              >
                <span className="onboarding-card-emoji" aria-hidden="true">
                  {emoji}
                </span>
                <span className="onboarding-card-prenom">{prenom}</span>
                <span className="onboarding-card-tagline">{tagline}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step >= 2 && id && (
        <form
          className="onboarding-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 2) continuerInfos();
            else if (step === 3) continuerObjectif();
            else valider();
          }}
        >
          {step === 2 && (
            <>
              <h1>Salut {profil?.prenom} 👋</h1>
              <p className="onboarding-sub">
                {migration ? 'On met ton profil à niveau.' : 'Tes bases, pour tes suivis.'}
              </p>
              {migration && (
                <p className="mig-prof">
                  <span>
                    Profil : {profil?.prenom} {profil?.emoji}
                  </span>
                  <span>non modifiable ici</span>
                </p>
              )}
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
                {migration && <p className="onb-hint">Dernière pesée enregistrée — modifiable si besoin.</p>}
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-naissance" className={migration ? 'onb-req' : undefined}>
                  Date de naissance
                </label>
                <input
                  id="ob-naissance"
                  type="date"
                  value={dateNaissance}
                  onChange={(e) => {
                    setError(null);
                    setDateNaissance(e.target.value);
                  }}
                />
                <p className="onb-hint">
                  {migration
                    ? 'Nouvelle saisie obligatoire : ton âge devient calculé.'
                    : 'Ton âge se calcule tout seul — plus rien à mettre à jour chaque année.'}
                </p>
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
              {migration && (
                <div className="onboarding-field">
                  <label htmlFor={`ob-obj-poids-${step}`}>Poids objectif (kg)</label>
                  <input
                    id={`ob-obj-poids-${step}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={poidsObjectif}
                    onChange={(e) => {
                      setError(null);
                      setPoidsObjectif(e.target.value);
                    }}
                  />
                  <p className="onb-hint">Repris de ton ancien profil — modifiable si besoin.</p>
                </div>
              )}
              <div className="onb-btnrow">
                {!migration && (
                  <button type="button" className="onb-back" onClick={retour}>
                    Retour
                  </button>
                )}
                <button type="button" className="onb-next" onClick={continuerInfos}>
                  Continuer <Icon name="chev-right" size={14} />
                </button>
              </div>
              {migration && (
                <p className="onb-hint">Ensuite : objectif puis compléments &amp; régime (2 écrans rapides).</p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1>Ton objectif</h1>
              <p className="onboarding-sub">Pour que l'app te suive dans la bonne direction.</p>
              <div className="rcards" role="radiogroup" aria-label="Type d'objectif">
                {OBJECTIF_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={objectifType === t.id}
                    className={`rcard${objectifType === t.id ? ' sel' : ''}`}
                    onClick={() => {
                      setError(null);
                      setObjectifType(t.id);
                    }}
                  >
                    <span className="rcard-t">
                      <Icon name={t.icone} size={14} />
                      {t.nom}
                    </span>
                    <span className="rcard-d">{t.desc}</span>
                  </button>
                ))}
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-echeance">
                  Échéance <span className="onb-opt">(optionnelle)</span>
                </label>
                <input
                  id="ob-echeance"
                  type="date"
                  value={echeance}
                  onChange={(e) => {
                    setError(null);
                    setEcheance(e.target.value);
                  }}
                />
              </div>
              <div className="onboarding-field">
                <label htmlFor={`ob-obj-poids-${step}`}>Poids objectif (kg)</label>
                <input
                  id={`ob-obj-poids-${step}`}
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
              <div className="onb-btnrow">
                <button type="button" className="onb-back" onClick={retour}>
                  Retour
                </button>
                <button type="button" className="onb-next" onClick={continuerObjectif}>
                  Continuer <Icon name="chev-right" size={14} />
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1>Personnalisation</h1>
              <p className="onboarding-sub">
                Tes compléments et ton régime — modifiable plus tard dans le profil.
              </p>
              <p className="onb-label">Compléments</p>
              <div className="chips">
                {COMPLEMENTS_PRESETS.map((preset) => {
                  const on = complements.some((c) => normaliseComplement(c) === normaliseComplement(preset));
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`chip${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => basculerPreset(preset)}
                    >
                      {preset}
                    </button>
                  );
                })}
                {complements
                  .filter((c) => !COMPLEMENTS_PRESETS.some((p) => normaliseComplement(p) === normaliseComplement(c)))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="chip on"
                      aria-pressed="true"
                      onClick={() => {
                        setError(null);
                        setComplements(complements.filter((x) => x !== c));
                      }}
                    >
                      {c}
                      <span className="rm" aria-hidden="true">
                        ✕
                      </span>
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
                    setError(null);
                    setNouveauComplement(e.target.value);
                  }}
                />
                <button type="button" onClick={ajouterComplement}>
                  <Icon name="plus" size={13} /> Ajouter
                </button>
              </div>
              <p className="onb-label">Régime</p>
              <div className="rline" role="radiogroup" aria-label="Régime">
                {REGIMES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={regime === r.id}
                    className={`rl${regime === r.id ? ' sel' : ''}`}
                    onClick={() => {
                      setError(null);
                      setRegime(r.id);
                    }}
                  >
                    <span className="rl-dot" aria-hidden="true" />
                    {r.nom}
                  </button>
                ))}
              </div>
              <p className="onb-label">Objectif</p>
              <div className="rline" role="radiogroup" aria-label="Type d'objectif">
                {OBJECTIF_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={objectifType === t.id}
                    className={`rl${objectifType === t.id ? ' sel' : ''}`}
                    onClick={() => {
                      setError(null);
                      setObjectifType(t.id);
                    }}
                  >
                    <span className="rl-dot" aria-hidden="true" />
                    {t.nom}
                  </button>
                ))}
              </div>
              <div className="onboarding-field">
                <label htmlFor={`ob-obj-poids-${step}`}>Poids objectif (kg)</label>
                <input
                  id={`ob-obj-poids-${step}`}
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
              <button type="submit" className="onboarding-cta onb-full">
                C'est parti ! 🚀
              </button>
              <div className="onb-btnrow">
                <button type="button" className="onb-back" onClick={retour}>
                  Retour
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
