import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import sampleRaw from '../src/assets/semaine-exemple.md?raw';
import App from '../src/App';
import { parseWeeklyFile } from '../src/lib/parse';
import { saveProfile, saveWeek } from '../src/lib/storage';
import type { ProfileKey } from '../src/lib/model';

const fixture = (semaine = '2026-S37', extraCourse = 'Carottes') => `---
semaine: ${semaine}
menu: A
du: 2026-09-07
au: 2026-09-13
---

## courses

### Legumes
- ${extraCourse}
- [ ] Épinards

### Viandes
- [ ] Poulet

## menu

### Lundi
- diner-famille: Poulet rôti

### Mardi
- dejeuner-marc: Restes poulet

## batch

- [ ] Riz (4 parts)

## marc

### Cibles
- 78 kg

### Seances
- [x] Full body

### Rappels
- Protéines à chaque repas

## melanie

### Cibles
- Keto strict

### Seances
- [ ] Cardio

### Rappels
- Électrolytes
`;

// Toute vue shell suppose un profil choisi (onboarding passé).
const initProfile = (id: ProfileKey = 'marc') => saveProfile({ id, age: 41, taille: 178 });

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche l’onboarding quand aucun profil n’est choisi (semaine chargée ou non)', () => {
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    render(<App />);

    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cuisine' })).not.toBeInTheDocument();
  });

  it('sans semaine stockée, la semaine d’exemple se charge automatiquement (aucun écran d’import)', () => {
    initProfile();
    render(<App />);

    expect(screen.getByText('Semaine 2026-S37')).toBeInTheDocument();
    expect(screen.getByText('07/09 → 13/09')).toBeInTheDocument();
    expect(screen.queryByText(/Importer/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Charger la semaine/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Changer de semaine/ })).not.toBeInTheDocument();
  });

  it('affiche le shell 2 onglets avec la semaine persistée', () => {
    initProfile();
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    render(<App />);

    expect(screen.getByText('Semaine 2026-S37')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cuisine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mon suivi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marc' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mélanie' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Importer/)).not.toBeInTheDocument();
  });

  it('navigue entre Cuisine et Mon suivi (données filtrées sur mon profil)', async () => {
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    initProfile('marc');
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Legumes', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Carottes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('heading', { name: 'Lundi', level: 3 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Batch' }));
    expect(screen.getByText(/Riz/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mon suivi' }));
    expect(screen.getByText(/Salut Marc/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Marc — Diet & Sport', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Full body')).toBeInTheDocument();
    expect(screen.queryByText('Cardio')).not.toBeInTheDocument();
  });

  it('affiche directement la semaine persistée après un re-render complet', () => {
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    initProfile();

    render(<App />);

    expect(screen.getByText('Semaine 2026-S37')).toBeInTheDocument();
    expect(screen.queryByText('Importer un .md')).not.toBeInTheDocument();
  });
});

describe('Theming (accent unique)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-profile');
  });

  it('ne pose plus data-profile sur <html>, quel que soit le profil', () => {
    saveProfile({ id: 'melanie', age: 38, taille: 165 });
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);

    render(<App />);

    expect(document.documentElement.getAttribute('data-profile')).toBeNull();
  });
});

describe('Design system & sémantique', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche le titre de semaine dans un h1 portant la classe week-title', () => {
    initProfile();
    render(<App />);

    const h1 = screen.getByRole('heading', { level: 1, name: 'Semaine 2026-S37' });
    expect(h1).toHaveClass('week-title');
  });

  it("marque l'onglet actif avec aria-current=page et le déplace au changement d'onglet", async () => {
    initProfile();
    const user = userEvent.setup();
    render(<App />);

    const cuisine = screen.getByRole('button', { name: 'Cuisine' });
    expect(cuisine).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Mon suivi' })).not.toHaveAttribute('aria-current');

    await user.click(screen.getByRole('button', { name: 'Mon suivi' }));
    expect(screen.getByRole('button', { name: 'Mon suivi' })).toHaveAttribute('aria-current', 'page');
    expect(cuisine).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Mon suivi' }).parentElement).toHaveAttribute(
      'data-active',
      'suivi',
    );
  });

  it('rend le dock flottant compact : pilule active, icône seule inactive', () => {
    initProfile();
    render(<App />);

    const cuisine = screen.getByRole('button', { name: 'Cuisine' });
    const dock = cuisine.parentElement;
    expect(dock).toHaveClass('tabbar-dock');
    expect(dock).toHaveAttribute('data-active', 'cuisine'); // pilule glissante pilotée en CSS
    expect(cuisine).toHaveClass('dock-tab-active');
    expect(cuisine).toHaveTextContent('Cuisine'); // label visible à l'actif

    const suivi = screen.getByRole('button', { name: 'Mon suivi' });
    expect(suivi).toHaveClass('dock-tab');
    expect(suivi).not.toHaveClass('dock-tab-active');
    expect(suivi).not.toHaveTextContent('Mon suivi'); // icône seule à l'inactif
  });
});

describe('Onboarding — objectifs optionnels', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("l onboarding accepte des objectifs optionnels et les persiste", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Marc/ }));
    await user.type(screen.getByLabelText('Poids (kg)'), '85');
    await user.type(screen.getByLabelText('Âge'), '41');
    await user.type(screen.getByLabelText('Taille (cm)'), '178');
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '72');
    // happy-dom ne soumet pas le form au clic du bouton (convention repo : fireEvent.submit)
    fireEvent.submit(document.querySelector('.onboarding-form')!);

    expect(JSON.parse(localStorage.getItem('sportapp:profile')!)).toMatchObject({
      id: 'marc',
      poidsObjectif: 72,
    });
  });
});

describe("Semaine d'exemple — contenu réel (Menu A, S37)", () => {
  it('se parse sans warning avec meta, menu, courses, batch et profils complets', () => {
    const { data, warnings } = parseWeeklyFile(sampleRaw);

    expect(warnings).toEqual([]);
    expect(data.meta).toEqual({
      semaine: '2026-S37',
      menu: 'A',
      du: '2026-09-07',
      au: '2026-09-13',
      titre: 'Menu A — Base poulet & bolo',
    });

    expect(data.menu.map((d) => d.jour)).toEqual([
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ]);
    for (const day of data.menu) {
      expect(day.dejeunerMarc).toBeTruthy();
      expect(day.dinerFamille).toBeTruthy();
    }
    // Le « : » interne doit rester dans la valeur, pas couper la clé
    expect(data.menu.find((d) => d.jour === 'Vendredi')?.dinerFamille).toBe(
      'Tacos maison : galettes + haché (reste bolo) + crudités + yaourt-citron',
    );
    expect(data.menu.find((d) => d.jour === 'Samedi')?.batch).toBe(
      '6-8 œufs durs (boxes de la semaine)',
    );

    expect(data.courses.length).toBeGreaterThanOrEqual(30);
    expect(new Set(data.courses.map((c) => c.rayon)).size).toBeGreaterThanOrEqual(5);
    expect(data.courses.find((c) => c.label === 'Pâtes')?.rayon).toBe('feculents');
    expect(data.courses.find((c) => c.label === 'Amandes/noix')?.rayon).toBe('divers');

    expect(data.batch).toHaveLength(5);
    expect(data.batch[0].label).toBe('Egg muffins ×10');

    expect(data.profiles.marc.cibles).toHaveLength(4);
    expect(data.profiles.marc.seances).toHaveLength(6);
    expect(data.profiles.marc.rappels).toHaveLength(2);
    expect(data.profiles.melanie.cibles).toHaveLength(4);
    expect(data.profiles.melanie.seances).toHaveLength(3);
    expect(data.profiles.melanie.rappels).toHaveLength(2);
  });

  it('lie une recette à au moins un repas de chaque jour, avec données complètes', () => {
    const { data, warnings } = parseWeeklyFile(sampleRaw);

    expect(warnings).toEqual([]);
    // R1-R7 : 7 recettes, chaque jour a son diner-famille lié + mercredi aussi le déjeuner Marc
    expect(data.recettes).toHaveLength(7);
    for (const day of data.menu) {
      expect(Object.keys(day.recetteRefs ?? {})).toContain('dinerFamille');
    }
    expect(data.menu.find((d) => d.jour === 'Mercredi')?.recetteRefs).toEqual({
      dejeunerMarc: expect.any(String),
      dinerFamille: expect.any(String),
    });
    // toutes les recettes liées portent kcal + étapes (contrat e2e « fiche recette »)
    for (const recette of data.recettes!) {
      expect(recette.kcal).toBeTruthy();
      expect(recette.etapes?.length).toBeGreaterThanOrEqual(1);
    }
  });
});
