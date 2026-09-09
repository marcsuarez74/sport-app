import type { ImportedWeek } from './model';

const triParDu = (a: ImportedWeek, b: ImportedWeek): number =>
  a.data.meta.du.localeCompare(b.data.meta.du);

export const semainesTriees = (semaines: ImportedWeek[]): ImportedWeek[] =>
  [...semaines].sort(triParDu);

// 1) la semaine contenant today (du <= today <= au) · 2) la prochaine à venir ·
// 3) sinon la dernière stockée (cycle expiré — l'app ne se vide jamais).
export const semaineCourante = (semaines: ImportedWeek[], today: string): ImportedWeek | null => {
  if (!semaines.length) return null;
  const tri = semainesTriees(semaines);
  return (
    tri.find((w) => w.data.meta.du <= today && today <= w.data.meta.au) ??
    tri.find((w) => w.data.meta.du > today) ??
    tri[tri.length - 1]
  );
};

export const indexSemaineCourante = (semaines: ImportedWeek[], today: string): number => {
  if (!semaines.length) return 0;
  const courante = semaineCourante(semaines, today);
  const idx = semaines.findIndex((w) => w.data.meta.semaine === courante?.data.meta.semaine);
  return idx >= 0 ? idx : 0;
};
