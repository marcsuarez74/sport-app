import type { ImportedWeek, ProfileKey, WeeklyData } from './model';

const WEEK_KEY = 'sportapp:week';
const checksKey = (s: string) => `sportapp:checks:${s}`;
const weightsKey = (p: string) => `sportapp:weights:${p}`;

const safeParse = <T>(key: string, raw: string | null, fallback: T): T => {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`Clé corrompue ignorée : ${key}`);
    localStorage.removeItem(key);
    return fallback;
  }
};

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
  if (!s) return null;
  const parsed = safeParse<ImportedWeek | null>(WEEK_KEY, s, null);
  if (!parsed || typeof parsed?.data?.meta?.semaine !== 'string') {
    console.warn(`Semaine corrompue ignorée : ${WEEK_KEY}`);
    localStorage.removeItem(WEEK_KEY);
    return null;
  }
  return parsed;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export const getChecks = (semaine: string): Record<string, boolean> => {
  const key = checksKey(semaine);
  const parsed = safeParse<unknown>(key, localStorage.getItem(key), null);
  if (!isPlainObject(parsed)) {
    console.warn(`Checks corrompus ignorés : ${key}`);
    localStorage.removeItem(key);
    return {};
  }
  return parsed as Record<string, boolean>;
};

export const setCheck = (semaine: string, id: string, done: boolean): void => {
  const c = getChecks(semaine);
  c[id] = done;
  localStorage.setItem(checksKey(semaine), JSON.stringify(c));
};

export const getWeights = (p: ProfileKey): WeightEntry[] => {
  const key = weightsKey(p);
  const parsed = safeParse<unknown>(key, localStorage.getItem(key), null);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((w) => !!w && typeof w.date === 'string' && typeof w.kg === 'number')
  ) {
    console.warn(`Pesées corrompues ignorées : ${key}`);
    localStorage.removeItem(key);
    return [];
  }
  return parsed as WeightEntry[];
};

// Remplace l'entrée existante pour `date` (upsert) puis persiste.
export const addWeight = (p: ProfileKey, date: string, kg: number): WeightEntry[] => {
  const list = getWeights(p)
    .filter((w) => w.date !== date)
    .concat({ date, kg })
    .sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(weightsKey(p), JSON.stringify(list));
  return list;
};
