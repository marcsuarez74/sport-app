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

export function parseWeeklyFile(raw: string): ParseResult {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error('Frontmatter introuvable : le fichier doit commencer par --- (semaine, menu, du, au).');
  const metaDoc = load(m[1]) as Record<string, string | undefined>;
  if (!metaDoc.semaine || !metaDoc.menu || !metaDoc.du || !metaDoc.au)
    throw new Error('Frontmatter incomplet : semaine, menu, du, au sont requis.');
  const meta: WeekMeta = {
    semaine: metaDoc.semaine,
    menu: metaDoc.menu,
    du: metaDoc.du,
    au: metaDoc.au,
    ...(metaDoc.titre !== undefined ? { titre: metaDoc.titre } : {}),
  };

  const warnings: string[] = [];
  const sections = splitH2(raw);
  const courses = parseCourses(sections.get('courses') ?? '');
  const menu = parseMenu(sections.get('menu') ?? '', warnings);
  const batch = parseItems(sections.get('batch') ?? '', 'batch');
  const profiles = {
    marc: parseProfile(sections.get('marc') ?? ''),
    melanie: parseProfile(sections.get('melanie') ?? ''),
  };
  for (const s of ['courses', 'menu', 'batch', 'marc', 'melanie'])
    if (!sections.has(s)) warnings.push(`Section ## « ${s} » absente ou vide.`);
  return { data: { meta, courses, menu, batch, profiles }, warnings };
}

function splitH2(body: string): Map<string, string> {
  const map = new Map<string, string>();
  let cur = '';
  let buf: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (cur) map.set(cur, buf.join('\n'));
      cur = slugify(h[1]);
      buf = [];
    } else if (cur) buf.push(line);
  }
  if (cur) map.set(cur, buf.join('\n'));
  return map;
}

function parseCourses(text: string): CourseItem[] {
  const out: CourseItem[] = [];
  let rayon = 'divers';
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      rayon = slugify(h[1]);
      continue;
    }
    const it = line.match(/^[-*]\s+(?!\[)(.+?)\s*$/);
    if (it) out.push({ id: `courses:${rayon}:${slugify(it[1])}`, rayon, label: it[1] });
  }
  return out;
}

function parseMenu(text: string, warnings: string[]): MenuDay[] {
  const days: MenuDay[] = [];
  let day: MenuDay | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (day) days.push(day);
      day = { jour: h[1] };
      continue;
    }
    const kv = line.match(/^[-*]\s+([a-z-]+)\s*:\s*(.+?)\s*$/);
    if (kv && day) {
      const key = MENU_KEYS[kv[1]];
      if (key) (day as MenuDay & Record<string, string | undefined>)[key] = kv[2];
      else warnings.push(`Clé menu inconnue « ${kv[1]} » ignorée (${day.jour}).`);
    }
  }
  if (day) days.push(day);
  return days;
}

function parseItems(text: string, section: string): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const plain = line.match(/^[-*]\s+(.+?)\s*$/);
    if (!plain) continue;
    const withBox = plain[1].match(/^\[( |x|X)\]\s+(.+)$/);
    out.push({ id: `${section}:${slugify(withBox ? withBox[2] : plain[1])}`, label: withBox ? withBox[2] : plain[1] });
  }
  return out;
}

function parseProfile(text: string): ProfileData {
  const res: ProfileData = { cibles: [], seances: [], rappels: [] };
  let cur: 'cibles' | 'seances' | 'rappels' | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      const k = slugify(h[1]);
      cur = k === 'cibles' || k === 'seances' || k === 'rappels' ? k : null;
      continue;
    }
    const plain = line.match(/^[-*]\s+(.+?)\s*$/);
    if (!plain || !cur) continue;
    if (cur === 'cibles' || cur === 'rappels') res[cur].push(plain[1]);
    else {
      const withBox = plain[1].match(/^\[( |x|X)\]\s+(.+)$/);
      res.seances.push({ id: `seances:${slugify(withBox ? withBox[2] : plain[1])}`, label: withBox ? withBox[2] : plain[1] });
    }
  }
  return res;
}
