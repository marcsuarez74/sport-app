export type ProfileKey = 'marc' | 'melanie';

export interface WeekMeta {
  semaine: string;
  menu: string;
  du: string;
  au: string;
  titre?: string;
}

export interface CourseItem {
  id: string;
  rayon: string;
  label: string;
  rituel?: boolean;
  note?: string;
}

export interface MenuDay {
  jour: string;
  dejeunerMarc?: string;
  dejeunerMelanie?: string;
  dinerFamille?: string;
  dinerMelanie?: string;
  batch?: string;
  recetteRefs?: Partial<Record<MealKey, string>>;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface Recette {
  id: string;
  nom: string;
  temps?: string;
  kcal?: number;
  proteines?: number;
  glucides?: number;
  lipides?: number;
  score?: number;
  image?: string;
  pour?: string;
  bases?: string[];
  etapes?: string[];
  mel?: string;
  batch?: string;
  fraicheur?: string;
  portions?: { marc?: string; melanie?: string };
}

export interface BaseCuisine {
  id: string;
  nom: string;
  texte: string;
}

export interface RituelEtape {
  id: string;
  creneau: string;
  label: string;
  detail?: string;
}

export interface MicroBatchJour {
  jour: string;
  quoi: string;
}

export type MealKey = 'dejeunerMarc' | 'dejeunerMelanie' | 'dinerFamille' | 'dinerMelanie' | 'batch';

export interface ProfileData {
  cibles: string[];
  seances: ChecklistItem[];
  rappels: string[];
}

export interface WeeklyData {
  meta: WeekMeta;
  courses: CourseItem[];
  budget?: string;
  menu: MenuDay[];
  batch: ChecklistItem[];
  profiles: Record<ProfileKey, ProfileData>;
  recettes?: Recette[];
  bases?: BaseCuisine[];
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
}

export interface ImportedWeek {
  raw: string;
  data: WeeklyData;
  importedAt: string;
}

export interface UserProfile {
  id: ProfileKey;
  age: number;
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number;
}

export const PRENOMS: Record<ProfileKey, string> = { marc: 'Marc', melanie: 'Mélanie' };
