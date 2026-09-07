import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProfileData, ProfileKey } from '../lib/model';
import { addWeight, getWeights } from '../lib/storage';
import type { WeightEntry } from '../lib/storage';
import { todayISO, formatDayMonth } from '../lib/dates';
import { Checklist } from './Checklist';
import { Sparkline } from './Sparkline';

const TITLES: Record<ProfileKey, string> = {
  marc: 'Marc — Diet & Sport',
  melanie: 'Mélanie — Keto & Sport',
};

const ACCENTS: Record<ProfileKey, string> = {
  marc: '#e07b39',
  melanie: '#3d9a6c',
};

export function ProfileView({
  profileKey,
  data,
  semaine,
}: {
  profileKey: ProfileKey;
  data: ProfileData;
  semaine: string;
}) {
  const [weights, setWeights] = useState<WeightEntry[]>(() => getWeights(profileKey));
  const [syncedProfile, setSyncedProfile] = useState(profileKey);
  const [date, setDate] = useState<string>(todayISO);
  const [kg, setKg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  if (syncedProfile !== profileKey) {
    setSyncedProfile(profileKey);
    setWeights(getWeights(profileKey));
    setError(null);
    setKg('');
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number(kg);
    if (Number.isNaN(value) || value <= 0) {
      setError('Poids invalide.');
      return;
    }
    setError(null);
    setWeights(addWeight(profileKey, date, value));
    setKg('');
  };

  return (
    <>
      <h2 className="profile-title">{TITLES[profileKey]}</h2>
      <section className="profile-section">
        <h3>Cibles</h3>
        <ul className="target-list">
          {data.cibles.map((cible) => (
            <li key={cible}>{cible}</li>
          ))}
        </ul>
      </section>
      <section className="profile-section">
        <h3>Séances de la semaine</h3>
        <Checklist items={data.seances} semaine={semaine} />
      </section>
      <section className="profile-section">
        <h3>Suivi poids</h3>
        <form className="weight-form" onSubmit={handleSubmit}>
          <input
            type="date"
            className="weight-date"
            name="date"
            aria-label="Date de la pesée"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Poids (kg)"
            name="kg"
            aria-label="Poids (kg)"
            value={kg}
            onChange={(e) => {
              setError(null);
              setKg(e.target.value);
            }}
          />
          <button type="submit">Ajouter</button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Sparkline values={weights.map((w) => w.kg)} color={ACCENTS[profileKey]} />
        <ul className="weight-list">
          {[...weights].reverse().map((w) => (
            <li key={w.date}>
              {formatDayMonth(w.date)} — {w.kg} kg
            </li>
          ))}
        </ul>
      </section>
      <section className="profile-section">
        <h3>Rappels</h3>
        <ul className="rappel-list">
          {data.rappels.map((rappel) => (
            <li key={rappel}>{rappel}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
