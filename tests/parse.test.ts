import { parseWeeklyFile, slugify } from '../src/lib/parse';

const FULL_WEEK = `---
semaine: 2026-S39
menu: A
titre: Menu A — Base poulet & bolo
du: 2026-09-21
au: 2026-09-27
---

## Courses
### Fraîcheur
- Poulet 600 g
- Yaourts skyr

### Épicerie
- Riz basmati
- Huile olive

## Menu
### Lundi
- dejeuner-marc: Poulet riz
- dejeuner-melanie: Salade poulet
- diner-famille: Bolo pâtes

### Mardi
- diner-famille: Curry légumes
- diner-melanie: Curry keto
- batch: Riz à l'avance

## Batch
- [ ] Cuire le riz
- [x] Sauce bolo
- Couper les légumes

## Marc
### Cibles
- 2200 kcal
- 150 g de protéines

### Séances
- [ ] PPG lundi
- Course 30 min

### Rappels
- Pesée le lundi

## Melanie
### Cibles
- 1600 kcal

### Séances
- [ ] Yoga mardi

### Rappels
- Pesée le lundi
`;

function frontmatterOnly(): string {
  return `---
semaine: 2026-S39
menu: A
du: 2026-09-21
au: 2026-09-27
---
`;
}

describe('parseWeeklyFile — semaine complète', () => {
  const { data, warnings } = parseWeeklyFile(FULL_WEEK);

  it('parse le frontmatter (meta) avec du/au toujours en chaînes', () => {
    expect(data.meta).toEqual({
      semaine: '2026-S39',
      menu: 'A',
      du: '2026-09-21',
      au: '2026-09-27',
      titre: 'Menu A — Base poulet & bolo',
    });
    expect(typeof data.meta.du).toBe('string');
    expect(typeof data.meta.au).toBe('string');
  });

  it('parse Courses avec rayons et préfixes d’id', () => {
    expect(data.courses).toEqual([
      { id: 'courses:fraicheur:poulet-600-g', rayon: 'fraicheur', label: 'Poulet 600 g' },
      { id: 'courses:fraicheur:yaourts-skyr', rayon: 'fraicheur', label: 'Yaourts skyr' },
      { id: 'courses:epicerie:riz-basmati', rayon: 'epicerie', label: 'Riz basmati' },
      { id: 'courses:epicerie:huile-olive', rayon: 'epicerie', label: 'Huile olive' },
    ]);
  });

  it('parse Menu avec clés mappées en camelCase et champs absents undefined', () => {
    expect(data.menu).toEqual([
      {
        jour: 'Lundi',
        dejeunerMarc: 'Poulet riz',
        dejeunerMelanie: 'Salade poulet',
        dinerFamille: 'Bolo pâtes',
      },
      {
        jour: 'Mardi',
        dinerFamille: 'Curry légumes',
        dinerMelanie: 'Curry keto',
        batch: "Riz à l'avance",
      },
    ]);
    expect(data.menu[0].dinerMelanie).toBeUndefined();
    expect(data.menu[0].batch).toBeUndefined();
    expect(data.menu[1].dejeunerMarc).toBeUndefined();
  });

  it('parse Batch (cases cochées ou non, items simples) avec ids, sans état done', () => {
    expect(data.batch).toEqual([
      { id: 'batch:cuire-le-riz', label: 'Cuire le riz' },
      { id: 'batch:sauce-bolo', label: 'Sauce bolo' },
      { id: 'batch:couper-les-legumes', label: 'Couper les légumes' },
    ]);
  });

  it('parse les profils Marc et Melanie', () => {
    expect(data.profiles.marc.cibles).toEqual(['2200 kcal', '150 g de protéines']);
    expect(data.profiles.marc.seances).toEqual([
      { id: 'seances:ppg-lundi', label: 'PPG lundi' },
      { id: 'seances:course-30-min', label: 'Course 30 min' },
    ]);
    expect(data.profiles.marc.rappels).toEqual(['Pesée le lundi']);

    expect(data.profiles.melanie.cibles).toEqual(['1600 kcal']);
    expect(data.profiles.melanie.seances).toEqual([
      { id: 'seances:yoga-mardi', label: 'Yoga mardi' },
    ]);
    expect(data.profiles.melanie.rappels).toEqual(['Pesée le lundi']);
  });

  it('ne produit aucun warning pour une semaine valide', () => {
    expect(warnings).toEqual([]);
  });
});

describe('parseWeeklyFile — variantes de checkboxes', () => {
  const { data } = parseWeeklyFile(`---
semaine: 2026-S40
menu: A
du: 2026-09-28
au: 2026-10-04
---

## Batch
- Plain item
- [ ] Todo item
- [x] Done item
`);

  it('parse - label, - [ ] label et - [x] label en items id+label uniquement', () => {
    expect(data.batch).toEqual([
      { id: 'batch:plain-item', label: 'Plain item' },
      { id: 'batch:todo-item', label: 'Todo item' },
      { id: 'batch:done-item', label: 'Done item' },
    ]);
  });
});

describe('parseWeeklyFile — en-tête avec accents', () => {
  const withAccent = parseWeeklyFile(`---
semaine: 2026-S41
menu: B
du: 2026-10-05
au: 2026-10-11
---

## Mélanie
### Rappels
- Pesée le lundi
`);
  const withoutAccent = parseWeeklyFile(`---
semaine: 2026-S41
menu: B
du: 2026-10-05
au: 2026-10-11
---

## Melanie
### Rappels
- Pesée le lundi
`);

  it('rattache ## Mélanie à profiles.melanie (slug sans accents)', () => {
    expect(withAccent.data.profiles.melanie.rappels).toEqual(['Pesée le lundi']);
  });

  it('## Melanie (sans accent) donne le même résultat', () => {
    expect(withoutAccent.data.profiles.melanie).toEqual(withAccent.data.profiles.melanie);
  });
});

describe('parseWeeklyFile — erreurs bloquantes', () => {
  it('sans frontmatter → throw « Frontmatter introuvable »', () => {
    expect(() => parseWeeklyFile('# Juste un titre, pas de frontmatter')).toThrow(
      /Frontmatter introuvable/,
    );
  });

  it('frontmatter incomplet (semaine manquante) → throw « Frontmatter incomplet »', () => {
    expect(() =>
      parseWeeklyFile(`---
menu: A
du: 2026-09-21
au: 2026-09-27
---
`),
    ).toThrow(/Frontmatter incomplet/);
  });
});

describe('parseWeeklyFile — corps vide', () => {
  const { data, warnings } = parseWeeklyFile(frontmatterOnly());

  it('produit toutes les sections vides', () => {
    expect(data.courses).toEqual([]);
    expect(data.menu).toEqual([]);
    expect(data.batch).toEqual([]);
    expect(data.profiles.marc.cibles).toEqual([]);
    expect(data.profiles.marc.seances).toEqual([]);
    expect(data.profiles.marc.rappels).toEqual([]);
    expect(data.profiles.melanie.cibles).toEqual([]);
    expect(data.profiles.melanie.seances).toEqual([]);
    expect(data.profiles.melanie.rappels).toEqual([]);
  });

  it('signale les 5 sections manquantes dans les warnings', () => {
    expect(warnings).toHaveLength(5);
    for (const section of ['courses', 'menu', 'batch', 'marc', 'melanie']) {
      expect(warnings.some((w) => w.includes(section))).toBe(true);
    }
  });
});

describe('parseWeeklyFile — clé menu inconnue', () => {
  const { data, warnings } = parseWeeklyFile(`---
semaine: 2026-S42
menu: C
du: 2026-10-12
au: 2026-10-18
---

## Menu
### Mercredi
- dessert: tarte
`);

  it('ignore la clé inconnue (non posée sur le jour)', () => {
    expect(data.menu).toEqual([{ jour: 'Mercredi' }]);
  });

  it('émet un warning mentionnant la clé et le jour', () => {
    expect(warnings.some((w) => w.includes('dessert') && w.includes('Mercredi'))).toBe(true);
  });
});

describe('stabilité des ids', () => {
  const week1 = parseWeeklyFile(`---
semaine: 2026-S39
menu: A
du: 2026-09-21
au: 2026-09-27
---

## Batch
- [ ] Cuire le riz
`);
  const week2 = parseWeeklyFile(`---
semaine: 2026-S40
menu: B
du: 2026-09-28
au: 2026-10-04
---

## Batch
- Cuire le riz
`);

  it('même label dans deux fichiers différents → même id', () => {
    expect(week1.data.batch[0].id).toBe('batch:cuire-le-riz');
    expect(week2.data.batch[0].id).toBe('batch:cuire-le-riz');
  });

  it('slugify gère accents, espaces et unités', () => {
    expect(slugify('Poulet 600 g')).toBe('poulet-600-g');
    expect(slugify('Mélanie')).toBe('melanie');
  });
});

describe('fins de ligne CRLF', () => {
  it('parse un fichier CRLF comme un fichier LF', () => {
    const lf = parseWeeklyFile(FULL_WEEK);
    const crlf = parseWeeklyFile(FULL_WEEK.replace(/\n/g, '\r\n'));
    expect(crlf.data).toEqual(lf.data);
    expect(crlf.warnings).toEqual(lf.warnings);
  });
});
