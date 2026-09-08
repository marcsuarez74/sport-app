import { load } from 'js-yaml';
import type {
  BaseCuisine,
  ChecklistItem,
  CourseItem,
  MealKey,
  MenuDay,
  MicroBatchJour,
  ProfileData,
  Recette,
  RituelEtape,
  WeekMeta,
  WeeklyData,
} from './model';

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const MENU_KEYS: Record<string, MealKey> = {
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metaDoc.du) || !/^\d{4}-\d{2}-\d{2}$/.test(metaDoc.au))
    throw new Error('Frontmatter incomplet : du et au doivent être au format AAAA-MM-JJ.');
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
  const batch = parseBatch(sections.get('batch') ?? '', warnings, seen);
  const rituel = parseRituel(sections.get('batch') ?? '', 'batch', warnings, seen);
  const microBatch = parseMicroBatch(sections.get('batch') ?? '', warnings);
  const recettes = parseRecettes(sections.get('recettes') ?? '', warnings);
  const bases = parseBases(sections.get('bases') ?? '', warnings);
  const profiles = {
    marc: parseProfile(sections.get('marc') ?? '', 'marc', warnings, seen),
    melanie: parseProfile(sections.get('melanie') ?? '', 'melanie', warnings, seen),
  };
  for (const s of ['courses', 'menu', 'batch', 'marc', 'melanie'])
    if (!sections.has(s)) warnings.push(`Section ## « ${s} » absente ou vide.`);
  return {
    data: {
      meta,
      courses,
      menu,
      batch,
      profiles,
      ...(recettes.length ? { recettes } : {}),
      ...(bases.length ? { bases } : {}),
      ...(rituel.length ? { rituel } : {}),
      ...(microBatch.length ? { microBatch } : {}),
    },
    warnings,
  };
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
      if (key) {
        const ref = kv[2].match(/\s*→\s*(\S+)\s*$/);
        const texte = ref ? kv[2].slice(0, ref.index).trimEnd() : kv[2];
        (day as MenuDay & Record<string, string | undefined>)[key] = texte;
        if (ref) {
          day.recetteRefs = { ...day.recetteRefs, [key]: ref[1] };
        }
      } else warnings.push(`Clé menu inconnue « ${kv[1]} » ignorée (${day.jour}).`);
    } else {
      warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
    }
  }
  if (day) days.push(day);
  return days;
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
        const id = `seances:${section}:${slugify(label)}`;
        registerId(id, section, seen, warnings);
        res.seances.push({ id, label });
      }
      continue;
    }
    warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
  }
  return res;
}

const BATCH_SUBS = new Set(['rituel-dimanche', 'micro-batch']);

export function parseBatch(text: string, warnings: string[], seen: Set<string>): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (const [line, cur] of lignesBatch(text, warnings)) {
    if (cur) continue;
    const plain = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!plain) {
      if (line.trim()) warnings.push(`Ligne ignorée (batch) : « ${preview(line)} »`);
      continue;
    }
    const withBox = plain[1].match(/^\[( |x|X)\]\s+(.+)$/);
    const label = withBox ? withBox[2] : plain[1];
    const id = `batch:${slugify(label)}`;
    registerId(id, 'batch', seen, warnings);
    out.push({ id, label });
  }
  return out;
}

function lignesBatch(text: string, warnings: string[]): Array<[string, string | null]> {
  const out: Array<[string, string | null]> = [];
  let cur: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      const k = slugify(h[1]);
      if (BATCH_SUBS.has(k)) cur = k;
      else {
        warnings.push(`Sous-section « ${h[1]} » ignorée (batch).`);
        cur = null;
      }
      continue;
    }
    if (!line.trim()) cur = null;
    out.push([line, cur]);
  }
  return out;
}

export function parseRituel(
  text: string,
  section: string,
  warnings: string[],
  seen: Set<string>,
): RituelEtape[] {
  const out: RituelEtape[] = [];
  for (const [line, cur] of lignesBatch(text, warnings)) {
    if (cur !== 'rituel-dimanche') continue;
    if (!line.trim()) continue;
    const m = line.match(
      /^\s*[-*]\s+(\S.*?min)\s*·\s*(.+?)(?:\s*—\s*(.+?))?\s*$/,
    );
    if (!m) {
      warnings.push(`Ligne ignorée (${section}/rituel) : « ${preview(line)} »`);
      continue;
    }
    const [, creneau, label, detail] = m;
    const id = `batch:rituel:${slugify(label)}`;
    registerId(id, `${section}/rituel`, seen, warnings);
    out.push({ id, creneau, label, ...(detail ? { detail } : {}) });
  }
  return out;
}

export function parseMicroBatch(text: string, warnings: string[]): MicroBatchJour[] {
  const out: MicroBatchJour[] = [];
  for (const [line, cur] of lignesBatch(text, warnings)) {
    if (cur !== 'micro-batch') continue;
    if (!line.trim()) continue;
    const m = line.match(/^\s*[-*]\s+([a-z-]+)\s*:\s*(.+?)\s*$/);
    if (!m) {
      warnings.push(`Ligne ignorée (batch/micro-batch) : « ${preview(line)} »`);
      continue;
    }
    out.push({ jour: m[1], quoi: m[2] });
  }
  return out;
}

function parseRecettes(text: string, warnings: string[]): Recette[] {
  const recettes: Recette[] = [];
  let rec: Recette | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (rec) recettes.push(rec);
      rec = { id: slugify(h[1]), nom: h[1] };
      continue;
    }
    if (!line.trim()) continue;
    if (!rec) {
      warnings.push(`Ligne ignorée (recettes) : « ${preview(line)} »`);
      continue;
    }
    const kv = line.match(/^(temps|kcal|proteines|bases)\s*:\s*(.+?)\s*$/);
    if (kv) {
      if (kv[1] === 'temps') rec.temps = kv[2];
      else if (kv[1] === 'kcal') rec.kcal = Number(kv[2].replace(/\s/g, ''));
      else if (kv[1] === 'proteines') rec.proteines = Number(kv[2].replace(/\s/g, ''));
      else rec.bases = kv[2].split(',').map((b) => b.trim());
      continue;
    }
    const pour = line.match(/^\s*[-*]\s+pour\s*(?:\d+\s*)?\s*:\s*(.+?)\s*$/);
    if (pour) {
      rec.pour = pour[1];
      continue;
    }
    const mel = line.match(/^\s*[-*]\s+mel\s*:\s*(.+?)\s*$/);
    if (mel) {
      rec.mel = mel[1];
      continue;
    }
    const bat = line.match(/^\s*[-*]\s+batch\s*:\s*(.+?)\s*$/);
    if (bat) {
      rec.batch = bat[1];
      continue;
    }
    const etape = line.match(/^\s*\d+[.)]\s+(.+?)\s*$/);
    if (etape) {
      rec.etapes = [...(rec.etapes ?? []), etape[1]];
      continue;
    }
    warnings.push(`Ligne ignorée (recettes) : « ${preview(line)} »`);
  }
  if (rec) recettes.push(rec);
  return recettes;
}

function parseBases(text: string, warnings: string[]): BaseCuisine[] {
  const bases: BaseCuisine[] = [];
  let base: BaseCuisine | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (base) bases.push(base);
      base = { id: slugify(h[1]), nom: h[1], texte: '' };
      continue;
    }
    if (!line.trim()) continue;
    if (!base) {
      warnings.push(`Ligne ignorée (bases) : « ${preview(line)} »`);
      continue;
    }
    base.texte = base.texte ? `${base.texte} ${line.trim()}` : line.trim();
  }
  if (base) bases.push(base);
  return bases;
}
