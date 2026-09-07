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

function weekWith(body: string): string {
  return `---
semaine: 2026-S99
menu: X
du: 2026-12-21
au: 2026-12-27
---

${body}`;
}

describe('syntaxe supportée : puces *, cases [X], items indentés', () => {
  const { data, warnings } = parseWeeklyFile(weekWith(`## Courses
### Fraîcheur
* Poireaux

## Menu
### Jeudi
  - diner-famille: Soupe poireaux
* batch: Pain

## Batch
* [X] Cuire les poireaux
  - [ ] Préparer la soupe
`));

  it('parse les puces astérisque et les items indentés', () => {
    expect(data.courses).toEqual([
      { id: 'courses:fraicheur:poireaux', rayon: 'fraicheur', label: 'Poireaux' },
    ]);
    expect(data.menu).toEqual([{ jour: 'Jeudi', dinerFamille: 'Soupe poireaux', batch: 'Pain' }]);
    expect(data.batch).toEqual([
      { id: 'batch:cuire-les-poireaux', label: 'Cuire les poireaux' },
      { id: 'batch:preparer-la-soupe', label: 'Préparer la soupe' },
    ]);
  });

  it('traite [X] majuscule comme case cochée (préfixe retiré)', () => {
    expect(data.batch[0].label).toBe('Cuire les poireaux');
  });

  it('ne génère aucun warning de ligne ignorée', () => {
    expect(warnings.filter((w) => !w.startsWith('Section ##'))).toEqual([]);
  });
});

describe('lignes ignorées', () => {
  it('courses : ligne non reconnue → warning « Ligne ignorée »', () => {
    const { warnings } = parseWeeklyFile(weekWith(`## Courses
### Fraîcheur
Texte libre sans puce
`));
    expect(warnings).toContain('Ligne ignorée (courses) : « Texte libre sans puce »');
  });

  it('courses : une case à cocher devient un item normal (préfixe retiré, pas de warning)', () => {
    const { data, warnings } = parseWeeklyFile(weekWith(`## Courses
### Fraîcheur
- [x] Poulet 600 g
`));
    expect(data.courses).toEqual([
      { id: 'courses:fraicheur:poulet-600-g', rayon: 'fraicheur', label: 'Poulet 600 g' },
    ]);
    expect(warnings.filter((w) => !w.startsWith('Section ##'))).toEqual([]);
  });

  it('menu : paire clé:valeur avant tout jour → warning « Ligne ignorée »', () => {
    const { data, warnings } = parseWeeklyFile(weekWith(`## Menu
- diner-famille: Repas orphelin
`));
    expect(data.menu).toEqual([]);
    expect(warnings).toContain('Ligne ignorée (menu) : « - diner-famille: Repas orphelin »');
  });

  it('profils : item avant tout ### → warning « Ligne ignorée »', () => {
    const { data, warnings } = parseWeeklyFile(weekWith(`## Marc
- Orphelin

### Cibles
- 2200 kcal
`));
    expect(data.profiles.marc.cibles).toEqual(['2200 kcal']);
    expect(warnings).toContain('Ligne ignorée (marc) : « - Orphelin »');
  });

  it('profils : item sous un ### inconnu → warning « Ligne ignorée »', () => {
    const { data, warnings } = parseWeeklyFile(weekWith(`## Melanie
### Divers
- Perdu
`));
    expect(data.profiles.melanie).toEqual({ cibles: [], seances: [], rappels: [] });
    expect(warnings).toContain('Ligne ignorée (melanie) : « - Perdu »');
  });

  it('tronque le contenu des longues lignes ignorées', () => {
    const long = 'Ligne'.repeat(16);
    const { warnings } = parseWeeklyFile(weekWith(`## Courses
${long}
`));
    const w = warnings.find((x) => x.startsWith('Ligne ignorée (courses)'));
    expect(w).toBeDefined();
    expect(w?.includes('…')).toBe(true);
    expect(w?.includes(long)).toBe(false);
  });
});

describe('ids dupliqués', () => {
  const { data, warnings } = parseWeeklyFile(weekWith(`## Courses
### Fraîcheur
- Eau
- Eau

### Épicerie
- Eau

## Batch
- Riz
- Riz
- Sauce
`));

  it('garde tous les éléments (pas de dédoublonnage ni suffixe)', () => {
    expect(data.courses.map((i) => i.id)).toEqual([
      'courses:fraicheur:eau',
      'courses:fraicheur:eau',
      'courses:epicerie:eau',
    ]);
    expect(data.batch.map((i) => i.id)).toEqual(['batch:riz', 'batch:riz', 'batch:sauce']);
  });

  it('émet un warning par id dupliqué, pas pour les ids distincts', () => {
    expect(warnings.filter((w) => w.startsWith('Id dupliqué'))).toEqual([
      'Id dupliqué « courses:fraicheur:eau » (courses) — les éléments partagent leur état de coche.',
      'Id dupliqué « batch:riz » (batch) — les éléments partagent leur état de coche.',
    ]);
  });
});

describe('section dupliquée', () => {
  it('deux fois ## Batch → warning et la seconde écrase la première', () => {
    const { data, warnings } = parseWeeklyFile(weekWith(`## Batch
- Un

## Batch
- Deux
`));
    expect(warnings).toContain('Section dupliquée « batch » — la seconde écrase la première.');
    expect(data.batch).toEqual([{ id: 'batch:deux', label: 'Deux' }]);
  });
});

describe('robustesse de l’entrée', () => {
  it('gère un BOM UTF-8 en tête de fichier', () => {
    const { data } = parseWeeklyFile('\uFEFF' + FULL_WEEK);
    expect(data.meta.semaine).toBe('2026-S39');
    expect(data.meta.au).toBe('2026-09-27');
  });

  it('rejette une valeur non textuelle dans le frontmatter (menu: 1)', () => {
    expect(() =>
      parseWeeklyFile(`---
semaine: 2026-S39
menu: 1
du: 2026-09-21
au: 2026-09-27
---
`),
    ).toThrow(/Frontmatter incomplet/);
  });
});
