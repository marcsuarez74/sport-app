import type { ImportedWeek, ProfileKey, WeeklyData } from './model';

const WEEK_KEY = 'sportapp:week';
const checksKey = (s: string) => `sportapp:checks:${s}`;
const weightsKey = (p: string) => `sportapp:weights:${p}`;

export interface WeightEntry {
  date: string;
  kg: number;
}

export const saveWeek = (raw: string, data: WeeklyData): void =>
  localStorage.setItem(
    WEEK_KEY,
    JSON.stringify({ raw, data, importedAt: new Date().toISOString() } satisfies ImportedWeek),
  );

export const loadWeek = (): ImportedWeek | null => {
  const s = localStorage.getItem(WEEK_KEY);
  return s ? (JSON.parse(s) as ImportedWeek) : null;
};

export const getChecks = (semaine: string): Record<string, boolean> =>
  JSON.parse(localStorage.getItem(checksKey(semaine)) ?? '{}');

export const setCheck = (semaine: string, id: string, done: boolean): void => {
  const c = getChecks(semaine);
  c[id] = done;
  localStorage.setItem(checksKey(semaine), JSON.stringify(c));
};

export const getWeights = (p: ProfileKey): WeightEntry[] =>
  JSON.parse(localStorage.getItem(weightsKey(p)) ?? '[]');

export const addWeight = (p: ProfileKey, date: string, kg: number): WeightEntry[] => {
  const list = getWeights(p)
    .filter((w) => w.date !== date)
    .concat({ date, kg })
    .sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(weightsKey(p), JSON.stringify(list));
  return list;
};
