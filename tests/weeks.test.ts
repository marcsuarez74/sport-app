import { describe, expect, it } from 'vitest';
import { indexSemaineCourante, semaineCourante, semainesTriees } from '../src/lib/weeks';
import type { ImportedWeek } from '../src/lib/model';

const semaine = (semaine: string, du: string, au: string, menu = 'A'): ImportedWeek => ({
  raw: '',
  importedAt: '',
  data: {
    meta: { semaine, menu, du, au },
    courses: [],
    menu: [],
    batch: [],
    profiles: {
      marc: { cibles: [], seances: [], rappels: [] },
      melanie: { cibles: [], seances: [], rappels: [] },
    },
  },
});

describe('weeks: semaineCourante', () => {
  it('retourne null sans semaine', () => {
    expect(semaineCourante([], '2026-09-15')).toBeNull();
  });

  it('retourne la semaine contenant aujourd’hui', () => {
    const s = [semaine('2026-S37', '2026-09-07', '2026-09-13')];
    expect(semaineCourante(s, '2026-09-09')?.data.meta.semaine).toBe('2026-S37');
  });

  it('bordures : du = aujourd’hui et au = aujourd’hui comptent', () => {
    const s = [semaine('2026-S38', '2026-09-14', '2026-09-20')];
    expect(semaineCourante(s, '2026-09-14')?.data.meta.semaine).toBe('2026-S38');
    expect(semaineCourante(s, '2026-09-20')?.data.meta.semaine).toBe('2026-S38');
  });

  it('gap entre deux semaines : la prochaine à venir', () => {
    const s = [
      semaine('2026-S37', '2026-09-07', '2026-09-13'),
      semaine('2026-S39', '2026-09-21', '2026-09-27'),
    ];
    expect(semaineCourante(s, '2026-09-16')?.data.meta.semaine).toBe('2026-S39');
  });

  it('après toutes les semaines : la dernière stockée', () => {
    const s = [semaine('2026-S38', '2026-09-14', '2026-09-20')];
    expect(semaineCourante(s, '2026-10-05')?.data.meta.semaine).toBe('2026-S38');
  });

  it('l’ordre d’import n’a pas d’importance', () => {
    const s = [
      semaine('2026-S39', '2026-09-21', '2026-09-27', 'C'),
      semaine('2026-S38', '2026-09-14', '2026-09-20', 'B'),
    ];
    expect(semaineCourante(s, '2026-09-22')?.data.meta.semaine).toBe('2026-S39');
    expect(semainesTriees(s).map((w) => w.data.meta.semaine)).toEqual(['2026-S38', '2026-S39']);
  });
});

describe('weeks: indexSemaineCourante', () => {
  it('donne l’index de la semaine courante dans la liste passée', () => {
    const s = [
      semaine('2026-S39', '2026-09-21', '2026-09-27', 'C'),
      semaine('2026-S38', '2026-09-14', '2026-09-20', 'B'),
    ];
    // 2026-09-16 est dans S38 -> index 1 dans [S39, S38]
    expect(indexSemaineCourante(s, '2026-09-16')).toBe(1);
    // 2026-09-22 est dans S39 -> index 0
    expect(indexSemaineCourante(s, '2026-09-22')).toBe(0);
  });

  it('liste vide -> 0', () => {
    expect(indexSemaineCourante([], '2026-09-22')).toBe(0);
  });
});
