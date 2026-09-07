export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;

export const todayKey = (): (typeof JOURS)[number] => JOURS[(new Date().getDay() + 6) % 7];
