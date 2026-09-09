import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProfileData, UserProfile } from '../lib/model';
import { addWeight, getWeights } from '../lib/storage';
import type { WeightEntry } from '../lib/storage';
import { todayISO, formatDayMonth } from '../lib/dates';
import { Checklist } from './Checklist';
import { WeightChart } from './WeightChart';

const TITLES: Record<UserProfile['id'], string> = {
  marc: 'Marc — Diet & Sport',
  melanie: 'Mélanie — Keto & Sport',
};

export function ProfileView({
  profile,
  data,
  semaine,
  onWeightsChanged,
}: {
  profile: UserProfile;
  data: ProfileData;
  semaine: string;
  onWeightsChanged?: () => void;
}) {
  const [weights, setWeights] = useState<WeightEntry[]>(() => getWeights(profile.id));
  const [syncedProfile, setSyncedProfile] = useState(profile.id);
  const [date, setDate] = useState<string>(todayISO);
  const [kg, setKg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  if (syncedProfile !== profile.id) {
    setSyncedProfile(profile.id);
    setWeights(getWeights(profile.id));
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
    setWeights(addWeight(profile.id, date, value));
    setKg('');
    onWeightsChanged?.();
  };

  return (
    <>
      <h2 className="profile-title">{TITLES[profile.id]}</h2>
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
        <WeightChart weights={weights} objectif={profile.poidsObjectif} />
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
