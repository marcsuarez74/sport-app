import type { WeeklyData } from '../src/lib/model';
import { addWeight, getChecks, getWeights, loadProfile, loadWeek, removeProfile, saveProfile, saveWeek, setCheck, type WeightEntry } from '../src/lib/storage';
import { todayKey } from '../src/lib/dates';

const week = (): WeeklyData => ({
  meta: { semaine: '2026-S39', menu: 'A', du: '2026-09-21', au: '2026-09-27' },
  courses: [{ id: 'c1', rayon: 'Fraîcheur', label: 'Poulet 600 g' }],
  menu: [{ jour: 'lundi', dejeunerMarc: 'Poulet riz' }],
  batch: [{ id: 'b1', label: 'Riz à l’avance' }],
  profiles: {
    marc: { cibles: [], seances: [], rappels: [] },
    melanie: { cibles: [], seances: [], rappels: [] },
  },
});

describe('storage: week', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadWeek returns null when nothing saved', () => {
    expect(loadWeek()).toBeNull();
  });

  it('saveWeek then loadWeek roundtrips the same data', () => {
    const raw = '---\nsemaine: 2026-S39\n---\n';
    const data = week();
    saveWeek(raw, data);
    const loaded = loadWeek();
    expect(loaded).toEqual({ raw, data, importedAt: expect.any(String) });
  });

  it('importedAt is an ISO string', () => {
    saveWeek('raw', week());
    const loaded = loadWeek();
    expect(loaded).not.toBeNull();
    expect(new Date(loaded!.importedAt).toISOString()).toBe(loaded!.importedAt);
  });
});

describe('storage: checks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getChecks is empty when nothing checked', () => {
    expect(getChecks('2026-S39')).toEqual({});
  });

  it('setCheck/getChecks store state per semaine', () => {
    setCheck('2026-S39', 'b1', true);
    setCheck('2026-S39', 'b2', true);
    setCheck('2026-S40', 'b3', true);
    expect(getChecks('2026-S39')).toEqual({ b1: true, b2: true });
    expect(getChecks('2026-S40')).toEqual({ b3: true });
  });

  it('checks are isolated between weeks', () => {
    setCheck('2026-S39', 'b1', true);
    setCheck('2026-S39', 'b1', false);
    expect(getChecks('2026-S40')).toEqual({});
  });

  it('setCheck overwrites previous state for same id', () => {
    setCheck('2026-S39', 'b1', true);
    setCheck('2026-S39', 'b1', false);
    expect(getChecks('2026-S39')).toEqual({ b1: false });
  });
});

describe('storage: weights', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getWeights returns [] when empty', () => {
    expect(getWeights('marc')).toEqual<WeightEntry[]>([]);
  });

  it('addWeight appends sorted by date', () => {
    const r1 = addWeight('marc', '2026-09-24', 80.5);
    const r2 = addWeight('marc', '2026-09-21', 81.2);
    const r3 = addWeight('marc', '2026-09-23', 80.8);
    expect(r3).toEqual<WeightEntry[]>([
      { date: '2026-09-21', kg: 81.2 },
      { date: '2026-09-23', kg: 80.8 },
      { date: '2026-09-24', kg: 80.5 },
    ]);
    expect(r1).toEqual<WeightEntry[]>([{ date: '2026-09-24', kg: 80.5 }]);
    expect(r2).toEqual<WeightEntry[]>([
      { date: '2026-09-21', kg: 81.2 },
      { date: '2026-09-24', kg: 80.5 },
    ]);
  });

  it('addWeight replaces entry with same date (no duplicates)', () => {
    addWeight('marc', '2026-09-21', 81.2);
    const list = addWeight('marc', '2026-09-21', 80.9);
    expect(list).toEqual<WeightEntry[]>([{ date: '2026-09-21', kg: 80.9 }]);
  });

  it('weights are isolated per profile', () => {
    addWeight('marc', '2026-09-21', 81.2);
    addWeight('melanie', '2026-09-21', 62.4);
    expect(getWeights('marc')).toEqual<WeightEntry[]>([{ date: '2026-09-21', kg: 81.2 }]);
    expect(getWeights('melanie')).toEqual<WeightEntry[]>([{ date: '2026-09-21', kg: 62.4 }]);
  });
});

describe('storage: corrupted keys', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('loadWeek returns null and removes a corrupted week key', () => {
    localStorage.setItem('sportapp:week', '{invalid');
    expect(loadWeek()).toBeNull();
    expect(localStorage.getItem('sportapp:week')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Clé corrompue ignorée : sportapp:week');
  });

  it('loadWeek returns null and removes a week with a valid JSON but malformed shape', () => {
    localStorage.setItem('sportapp:week', '{"foo":1}');
    expect(loadWeek()).toBeNull();
    expect(localStorage.getItem('sportapp:week')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Semaine corrompue ignorée : sportapp:week');
  });

  it('getChecks returns {} and removes a corrupted checks key', () => {
    localStorage.setItem('sportapp:checks:2026-S39', 'nope[');
    expect(getChecks('2026-S39')).toEqual({});
    expect(localStorage.getItem('sportapp:checks:2026-S39')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Clé corrompue ignorée : sportapp:checks:2026-S39');
  });

  it('getChecks returns {} and removes a valid JSON with a wrong shape (array)', () => {
    localStorage.setItem('sportapp:checks:2026-S39', '[1,2]');
    expect(getChecks('2026-S39')).toEqual({});
    expect(localStorage.getItem('sportapp:checks:2026-S39')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Checks corrompus ignorés : sportapp:checks:2026-S39');
  });

  it('getChecks returns {} and removes a valid JSON with a wrong shape (null)', () => {
    localStorage.setItem('sportapp:checks:2026-S39', 'null');
    expect(getChecks('2026-S39')).toEqual({});
    expect(localStorage.getItem('sportapp:checks:2026-S39')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Checks corrompus ignorés : sportapp:checks:2026-S39');
  });

  it('getWeights returns [] and removes a corrupted weights key', () => {
    localStorage.setItem('sportapp:weights:marc', '{"date":');
    expect(getWeights('marc')).toEqual<WeightEntry[]>([]);
    expect(localStorage.getItem('sportapp:weights:marc')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Clé corrompue ignorée : sportapp:weights:marc');
  });

  it('getWeights returns [] and removes a valid JSON with a wrong shape (object)', () => {
    localStorage.setItem('sportapp:weights:marc', '{"a":1}');
    expect(getWeights('marc')).toEqual<WeightEntry[]>([]);
    expect(localStorage.getItem('sportapp:weights:marc')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Pesées corrompues ignorées : sportapp:weights:marc');
  });

  it('getWeights returns [] and removes entries with wrong field types', () => {
    localStorage.setItem('sportapp:weights:marc', '[{"date":"2026-09-21","kg":"81.2"}]');
    expect(getWeights('marc')).toEqual<WeightEntry[]>([]);
    expect(localStorage.getItem('sportapp:weights:marc')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Pesées corrompues ignorées : sportapp:weights:marc');
  });

  it('getChecks returns {} silently on an absent key (no warn, no remove)', () => {
    expect(getChecks('2026-S40')).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('getWeights returns [] silently on an absent key (no warn, no remove)', () => {
    expect(getWeights('marc')).toEqual<WeightEntry[]>([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('storage: profil', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadProfile returns null silently when nothing saved (no warn, no remove)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadProfile()).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('saveProfile then loadProfile roundtrips the profile', () => {
    saveProfile({ id: 'marc', age: 41, taille: 178 });
    expect(loadProfile()).toEqual({ id: 'marc', age: 41, taille: 178 });
    saveProfile({ id: 'melanie', age: 38, taille: 165 });
    expect(loadProfile()).toEqual({ id: 'melanie', age: 38, taille: 165 });
  });

  it('removeProfile removes the stored profile', () => {
    saveProfile({ id: 'marc', age: 41, taille: 178 });
    removeProfile();
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
  });

  it('les objectifs optionnels sont persistés et rechargés', () => {
    localStorage.clear();
    saveProfile({ id: 'marc', age: 41, taille: 178, poidsObjectif: 72, kcalObjectif: 2450 });
    expect(loadProfile()).toEqual({
      id: 'marc',
      age: 41,
      taille: 178,
      poidsObjectif: 72,
      kcalObjectif: 2450,
    });
  });

  it('un profil ancien sans objectifs charge tel quel', () => {
    localStorage.clear();
    localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'marc', age: 41, taille: 178 }));
    expect(loadProfile()).toEqual({ id: 'marc', age: 41, taille: 178 });
  });

  it('un objectif non numérique invalide le profil (réparation silencieuse)', () => {
    localStorage.clear();
    localStorage.setItem(
      'sportapp:profile',
      JSON.stringify({ id: 'marc', age: 41, taille: 178, poidsObjectif: 'soixante' }),
    );
    expect(loadProfile()).toBeNull();
  });
});

describe('storage: profil corrompu', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('loadProfile returns null and removes corrupted JSON', () => {
    localStorage.setItem('sportapp:profile', '{oops');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Profil corrompu ignoré : sportapp:profile');
  });

  it('loadProfile returns null and removes an unknown profile id', () => {
    localStorage.setItem('sportapp:profile', '{"id":"jean","age":41,"taille":178}');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Profil corrompu ignoré : sportapp:profile');
  });

  it('loadProfile returns null and removes non-numeric age', () => {
    localStorage.setItem('sportapp:profile', '{"id":"marc","age":"41","taille":178}');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
  });

  it('loadProfile returns null and removes missing taille', () => {
    localStorage.setItem('sportapp:profile', '{"id":"melanie","age":38}');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
  });

  it('loadProfile returns null and removes wrong shape (array, null)', () => {
    localStorage.setItem('sportapp:profile', '[1]');
    expect(loadProfile()).toBeNull();
    localStorage.setItem('sportapp:profile', 'null');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
  });
});

describe('dates: todayKey', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns mardi on Tuesday 2026-09-22', () => {
    vi.useFakeTimers();
    // Utiliser la forme `T10:00:00` (parse en heure locale), pas la forme date-only (parse en UTC).
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    expect(todayKey()).toBe('mardi');
  });

  it('returns samedi on Saturday 2026-09-26', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T10:00:00'));
    expect(todayKey()).toBe('samedi');
  });

  it('returns dimanche on Sunday 2026-09-27', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:00:00'));
    expect(todayKey()).toBe('dimanche');
  });
});
