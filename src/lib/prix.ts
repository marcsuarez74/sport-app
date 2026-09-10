const format = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// 38.2 -> « 38,20 € » (fr-FR, 2 décimales) — carte budget, résumé, historique.
export const formatEuro = (n: number): string => format.format(n);

// « 38,20 » | « 38.2 » | « 41,30 » -> number arrondi à 2 décimales ; null si
// invalide ou ≤ 0 (une dépense ne peut pas être nulle).
export const parseEuro = (s: string): number | null => {
  const n = Number.parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
};
