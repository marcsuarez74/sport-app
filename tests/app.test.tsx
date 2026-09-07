import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const uploadFile = async (input: HTMLInputElement, content: string) => {
  const file = new File([content], 'semaine.md', { type: 'text/markdown' });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

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
