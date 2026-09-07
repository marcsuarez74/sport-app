export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;

export const todayKey = (): (typeof JOURS)[number] => JOURS[(new Date().getDay() + 6) % 7];

// Date locale en `YYYY-MM-DD` (toISOString serait en UTC et décalerait d'un jour selon le fuseau).
export const todayISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// '2026-09-21' -> '21/09' (journal hebdo, l'année est superflue). Un simple split
// évite le parsing UTC de new Date sur la forme date-only.
export const formatDayMonth = (iso: string): string => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};
