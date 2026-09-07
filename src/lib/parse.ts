import { load } from 'js-yaml';
import type { ChecklistItem, CourseItem, MenuDay, ProfileData, WeekMeta, WeeklyData } from './model';

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const MENU_KEYS: Record<string, keyof MenuDay> = {
  'dejeuner-marc': 'dejeunerMarc',
  'dejeuner-melanie': 'dejeunerMelanie',
  'diner-famille': 'dinerFamille',
  'diner-melanie': 'dinerMelanie',
  batch: 'batch',
};

export interface ParseResult {
  data: WeeklyData;
  warnings: string[];
}

function preview(line: string): string {
  const t = line.trim();
  return t.length > 40 ? `${t.slice(0, 39)}…` : t;
}

function duplicateIdWarning(id: string, section: string): string {
  return `Id dupliqué « ${id} » (${section}) — les éléments partagent leur état de coche.`;
}

function registerId(id: string, section: string, seen: Set<string>, warnings: string[]): void {
  if (seen.has(id)) warnings.push(duplicateIdWarning(id, section));
  seen.add(id);
}

export function parseWeeklyFile(raw: string): ParseResult {
  const content = raw.replace(/^\uFEFF/, '');
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error('Frontmatter introuvable : le fichier doit commencer par --- (semaine, menu, du, au).');
  // YAML : un « # » précédé d'une espace dans une valeur non quotée démarre un commentaire — js-yaml tronque alors la valeur.
  const metaDoc = load(m[1]) as Record<string, string | undefined>;
  if (
    !metaDoc.semaine ||
    !metaDoc.menu ||
    !metaDoc.du ||
    !metaDoc.au ||
    typeof metaDoc.semaine !== 'string' ||
    typeof metaDoc.menu !== 'string' ||
    typeof metaDoc.du !== 'string' ||
    typeof metaDoc.au !== 'string'
  )
    throw new Error('Frontmatter incomplet : semaine, menu, du, au sont requis.');
  const meta: WeekMeta = {
    semaine: metaDoc.semaine,
    menu: metaDoc.menu,
    du: metaDoc.du,
    au: metaDoc.au,
    ...(typeof metaDoc.titre === 'string' ? { titre: metaDoc.titre } : {}),
  };

  const warnings: string[] = [];
  const seen = new Set<string>();
  const sections = splitH2(content, warnings);
  const courses = parseCourses(sections.get('courses') ?? '', 'courses', warnings, seen);
  const menu = parseMenu(sections.get('menu') ?? '', 'menu', warnings);
  const batch = parseItems(sections.get('batch') ?? '', 'batch', warnings, seen);
  const profiles = {
    marc: parseProfile(sections.get('marc') ?? '', 'marc', warnings, seen),
    melanie: parseProfile(sections.get('melanie') ?? '', 'melanie', warnings, seen),
  };
  for (const s of ['courses', 'menu', 'batch', 'marc', 'melanie'])
    if (!sections.has(s)) warnings.push(`Section ## « ${s} » absente ou vide.`);
  return { data: { meta, courses, menu, batch, profiles }, warnings };
}

function splitH2(raw: string, warnings: string[]): Map<string, string> {
  const map = new Map<string, string>();
  let cur = '';
  let buf: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (cur) map.set(cur, buf.join('\n'));
      cur = slugify(h[1]);
      if (map.has(cur)) warnings.push(`Section dupliquée « ${cur} » — la seconde écrase la première.`);
      buf = [];
    } else if (cur) buf.push(line);
  }
  if (cur) map.set(cur, buf.join('\n'));
  return map;
}

function parseCourses(text: string, section: string, warnings: string[], seen: Set<string>): CourseItem[] {
  const out: CourseItem[] = [];
  let rayon = 'divers';
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      rayon = slugify(h[1]);
      continue;
    }
    const it = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (it) {
      const withBox = it[1].match(/^\[( |x|X)\]\s+(.+)$/);
      const label = withBox ? withBox[2] : it[1];
      const id = `courses:${rayon}:${slugify(label)}`;
      registerId(id, section, seen, warnings);
      out.push({ id, rayon, label });
      continue;
    }
    if (line.trim()) warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
  }
  return out;
}

function parseMenu(text: string, section: string, warnings: string[]): MenuDay[] {
  const days: MenuDay[] = [];
  let day: MenuDay | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (day) days.push(day);
      day = { jour: h[1] };
      continue;
    }
    if (!line.trim()) continue;
    const kv = line.match(/^\s*[-*]\s+([a-z-]+)\s*:\s*(.+?)\s*$/);
    if (kv && day) {
      const key = MENU_KEYS[kv[1]];
      if (key) (day as MenuDay & Record<string, string | undefined>)[key] = kv[2];
      else warnings.push(`Clé menu inconnue « ${kv[1]} » ignorée (${day.jour}).`);
    } else {
      warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
    }
  }
  if (day) days.push(day);
  return days;
}

function parseItems(text: string, section: string, warnings: string[], seen: Set<string>): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const plain = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!plain) {
      if (line.trim()) warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
      continue;
    }
    const withBox = plain[1].match(/^\[( |x|X)\]\s+(.+)$/);
    const label = withBox ? withBox[2] : plain[1];
    const id = `${section}:${slugify(label)}`;
    registerId(id, section, seen, warnings);
    out.push({ id, label });
  }
  return out;
}

function parseProfile(text: string, section: string, warnings: string[], seen: Set<string>): ProfileData {
  const res: ProfileData = { cibles: [], seances: [], rappels: [] };
  let cur: 'cibles' | 'seances' | 'rappels' | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      const k = slugify(h[1]);
      cur = k === 'cibles' || k === 'seances' || k === 'rappels' ? k : null;
      continue;
    }
    if (!line.trim()) continue;
    const plain = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (plain && cur) {
      if (cur === 'cibles' || cur === 'rappels') res[cur].push(plain[1]);
      else {
        const withBox = plain[1].match(/^\[( |x|X)\]\s+(.+)$/);
        const label = withBox ? withBox[2] : plain[1];
        const id = `seances:${slugify(label)}`;
        registerId(id, section, seen, warnings);
        res.seances.push({ id, label });
      }
      continue;
    }
    warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
  }
  return res;
}
