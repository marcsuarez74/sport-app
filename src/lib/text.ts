export const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const fmtKg = (kg: number): string => kg.toFixed(1).replace('.', ',');
