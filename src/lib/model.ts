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
}

export interface MenuDay {
  jour: string;
  dejeunerMarc?: string;
  dejeunerMelanie?: string;
  dinerFamille?: string;
  dinerMelanie?: string;
  batch?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ProfileData {
  cibles: string[];
  seances: ChecklistItem[];
  rappels: string[];
}

export interface WeeklyData {
  meta: WeekMeta;
  courses: CourseItem[];
  menu: MenuDay[];
  batch: ChecklistItem[];
  profiles: Record<ProfileKey, ProfileData>;
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
}

export const PRENOMS: Record<ProfileKey, string> = { marc: 'Marc', melanie: 'Mélanie' };
