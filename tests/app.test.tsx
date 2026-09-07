import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import sampleRaw from '../src/assets/semaine-exemple.md?raw';
import App from '../src/App';
import { parseWeeklyFile } from '../src/lib/parse';
import { saveWeek } from '../src/lib/storage';

const fixture = (semaine = '2026-S39', extraCourse = 'Carottes') => `---
semaine: ${semaine}
menu: A
du: 2026-09-21
au: 2026-09-27
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

const getFileInput = (container: HTMLElement): HTMLInputElement =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

const uploadFile = (input: HTMLInputElement, content: string) =>
  userEvent
    .setup()
    .upload(input, new File([content], 'semaine.md', { type: 'text/markdown' }));

// happy-dom n'expose pas window.confirm : on le remplace par un stub global.
const mockConfirm = (value: boolean) => {
  const spy = vi.fn().mockReturnValue(value);
  vi.stubGlobal('confirm', spy);
  return spy;
};

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche ImportScreen quand aucune semaine est chargée', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sport App', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Importer un .md')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "Charger la semaine d'exemple" }),
    ).toBeInTheDocument();
  });

  it('le bouton exemple importe la semaine et affiche le shell complet', async () => {
    const sample = parseWeeklyFile(sampleRaw);
    expect(sample.warnings).toEqual([]);
    expect(sample.data.meta.semaine).toBe('2026-S39');

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: "Charger la semaine d'exemple" }));

    expect(screen.getByText('Semaine 2026-S39')).toBeInTheDocument();
    expect(screen.getByText('Menu A')).toBeInTheDocument();
    expect(screen.getByText('21/09 → 27/09')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🛒 Cuisine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '💪 Marc' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🥑 Mélanie' })).toBeInTheDocument();
    expect(screen.getByText('Changer de semaine')).toBeInTheDocument();
    expect(screen.queryByText("Charger la semaine d'exemple")).not.toBeInTheDocument();
  });

  it('navigue entre les onglets et affiche chaque vue', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: "Charger la semaine d'exemple" }));

    expect(screen.getByRole('heading', { name: 'Legumes', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Carottes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '📅 Menu' }));
    expect(screen.getByRole('heading', { name: 'Lundi', level: 3 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '📦 Batch' }));
    expect(screen.getByText(/Gros batch/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '💪 Marc' }));
    expect(screen.getByRole('heading', { name: 'Marc — Diet & Sport', level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '🥑 Mélanie' }));
    expect(
      screen.getByRole('heading', { name: 'Mélanie — Keto & Sport', level: 2 }),
    ).toBeInTheDocument();
  });

  it("affiche une erreur et garde la semaine courante si l'import échoue", async () => {
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    const { container } = render(<App />);
    expect(screen.getByText('Semaine 2026-S39')).toBeInTheDocument();

    await uploadFile(getFileInput(container), 'pas de frontmatter ici');

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Frontmatter introuvable/);
    expect(screen.getByText('Semaine 2026-S39')).toBeInTheDocument();
  });

  it('demande confirmation avant de remplacer une autre semaine (refus puis acceptation)', async () => {
    const confirmSpy = mockConfirm(false);
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    const { container } = render(<App />);
    const input = getFileInput(container);

    await uploadFile(input, fixture('2026-S40'));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/2026-S39.*2026-S40/s));
    expect(screen.getByText('Semaine 2026-S39')).toBeInTheDocument();
    expect(screen.queryByText('Semaine 2026-S40')).not.toBeInTheDocument();

    confirmSpy.mockReturnValue(true);
    await uploadFile(input, fixture('2026-S40'));
    await waitFor(() => expect(screen.getByText('Semaine 2026-S40')).toBeInTheDocument());
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Semaine 2026-S39')).not.toBeInTheDocument();
  });

  it('réinitialise le champ file même en cas de refus de confirmation', async () => {
    const confirmSpy = mockConfirm(false);
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    const { container } = render(<App />);
    const input = getFileInput(container);

    await uploadFile(input, fixture('2026-S40'));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Semaine 2026-S39')).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it("réimporte la même semaine sans confirmation", async () => {
    const confirmSpy = mockConfirm(false);
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);
    const { container } = render(<App />);
    const input = getFileInput(container);

    await uploadFile(input, fixture('2026-S39', 'Poireaux'));

    await waitFor(() => expect(screen.getByText('Poireaux')).toBeInTheDocument());
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Carottes')).not.toBeInTheDocument();
  });

  it('affiche directement la semaine persistée sans écran import', () => {
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);

    render(<App />);

    expect(screen.getByText('Semaine 2026-S39')).toBeInTheDocument();
    expect(screen.getByText('21/09 → 27/09')).toBeInTheDocument();
    expect(screen.queryByText('Importer un .md')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Charger la semaine d'exemple" })).not.toBeInTheDocument();
  });
});

describe("Semaine d'exemple — contenu réel (Menu A, S39)", () => {
  it('se parse sans warning avec meta, menu, courses, batch et profils complets', () => {
    const { data, warnings } = parseWeeklyFile(sampleRaw);

    expect(warnings).toEqual([]);
    expect(data.meta).toEqual({
      semaine: '2026-S39',
      menu: 'A',
      du: '2026-09-21',
      au: '2026-09-27',
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
});
