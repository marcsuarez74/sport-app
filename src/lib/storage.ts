import type { ImportedWeek, ProfileKey, ProfilLegacy, UserProfile, WeeklyData } from './model';

const WEEK_KEY = 'sportapp:week';
const WEEKS_KEY = 'sportapp:weeks';
const PROFILE_KEY = 'sportapp:profile';
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

const estSemaineValide = (v: unknown): v is ImportedWeek =>
  isPlainObject(v) &&
  typeof v.raw === 'string' &&
  typeof v.importedAt === 'string' &&
  isPlainObject(v.data) &&
  isPlainObject(v.data.meta) &&
  typeof v.data.meta.semaine === 'string';

// Lecture du stock multi-semaines. Garde de forme PAR ENTRÉE : une semaine
// corrompue est retirée de la mémoire (warn), les autres sont gardées.
// Si le stock est absent/vide, l'ancienne clé sportapp:week est migrée dedans
// (l'ancienne clé reste en place, non écrite).
export const loadWeeks = (): Record<string, ImportedWeek> => {
  const raw = localStorage.getItem(WEEKS_KEY);
  if (raw === null) return migrerAncienneSemaine();
  const parsed = safeParse<unknown>(WEEKS_KEY, raw, null);
  if (!isPlainObject(parsed) || !isPlainObject(parsed.semaines)) {
    console.warn(`Semaines corrompues ignorées : ${WEEKS_KEY}`);
    localStorage.removeItem(WEEKS_KEY);
    return migrerAncienneSemaine();
  }
  const semaines: Record<string, ImportedWeek> = {};
  for (const [id, entry] of Object.entries(parsed.semaines)) {
    if (estSemaineValide(entry)) semaines[id] = entry;
    else console.warn(`Semaine corrompue ignorée : ${id}`);
  }
  return semaines;
};

const migrerAncienneSemaine = (): Record<string, ImportedWeek> => {
  const ancienne = loadWeek();
  if (!ancienne) return {};
  const semaines = { [ancienne.data.meta.semaine]: ancienne };
  localStorage.setItem(WEEKS_KEY, JSON.stringify({ semaines }));
  return semaines;
};

// Même meta.semaine -> remplace ; les autres semaines restent.
export const upsertWeek = (raw: string, data: WeeklyData): void => {
  const semaines = loadWeeks();
  semaines[data.meta.semaine] = {
    raw,
    data,
    importedAt: new Date().toISOString(),
  } satisfies ImportedWeek;
  localStorage.setItem(WEEKS_KEY, JSON.stringify({ semaines }));
};

export const getChecks = (semaine: string): Record<string, boolean> => {
  const key = checksKey(semaine);
  const raw = localStorage.getItem(key);
  if (raw === null) return {};
  const parsed = safeParse<unknown>(key, raw, null);
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
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  const parsed = safeParse<unknown>(key, raw, null);
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

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const removeProfile = (): void => {
  localStorage.removeItem(PROFILE_KEY);
};

export const loadProfile = (): UserProfile | null => {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw === null) return null;
  const parsed = safeParse<unknown>(PROFILE_KEY, raw, null);
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const optionalNum = (v: unknown): boolean => v === undefined || isNum(v);
  const ok =
    isPlainObject(parsed) &&
    (parsed.id === 'marc' || parsed.id === 'melanie') &&
    isNum(parsed.age) &&
    isNum(parsed.taille) &&
    optionalNum(parsed.poidsObjectif) &&
    optionalNum(parsed.kcalObjectif);
  if (!ok) {
    console.warn(`Profil corrompu ignoré : ${PROFILE_KEY}`);
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
  return parsed as unknown as UserProfile;
};

// Ancienne forme du profil ({age}) — lecture read-only pour préremplir
// l'onboarding de migration. Pas de warn ni de remove : la clé est écrasée
// par le saveProfile v2, pas avant.
export const loadProfilLegacy = (): ProfilLegacy | null => {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw === null) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const optionalNum = (v: unknown): boolean => v === undefined || isNum(v);
  const ok =
    isPlainObject(parsed) &&
    (parsed.id === 'marc' || parsed.id === 'melanie') &&
    isNum(parsed.age) &&
    isNum(parsed.taille) &&
    optionalNum(parsed.poidsObjectif) &&
    optionalNum(parsed.kcalObjectif);
  return ok ? (parsed as unknown as ProfilLegacy) : null;
};
