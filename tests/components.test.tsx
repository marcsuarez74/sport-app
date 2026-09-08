import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChecklistItem, CourseItem, MenuDay, ProfileData } from '../src/lib/model';
import { addWeight, getChecks, getWeights, setCheck } from '../src/lib/storage';
import { todayISO } from '../src/lib/dates';
import { Checklist } from '../src/components/Checklist';
import { Sparkline } from '../src/components/Sparkline';
import { ShoppingList } from '../src/components/cuisine/ShoppingList';
import { MenuView } from '../src/components/cuisine/MenuView';
import { BatchView } from '../src/components/cuisine/BatchView';
import { ProfileView } from '../src/components/ProfileView';
import { WeekBanner } from '../src/components/WeekBanner';

const items: ChecklistItem[] = [
  { id: 'repas-a', label: 'Préparer les repas' },
  { id: 'course-b', label: 'Faire les courses' },
];

describe('Checklist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders one label per item with the item text', () => {
    render(<Checklist items={items} semaine="S39" />);
    expect(screen.getByText('Préparer les repas')).toBeInTheDocument();
    expect(screen.getByText('Faire les courses')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('Préparer les repas').closest('label')).not.toHaveClass('done');
  });

  it('checking an item persists it for the week and marks the label done', async () => {
    const user = userEvent.setup();
    render(<Checklist items={items} semaine="S39" />);
    await user.click(screen.getByRole('checkbox', { name: 'Préparer les repas' }));
    expect(getChecks('S39')).toEqual({ 'repas-a': true });
    expect(screen.getByRole('checkbox', { name: 'Préparer les repas' })).toBeChecked();
    expect(screen.getByText('Préparer les repas').closest('label')).toHaveClass('done');
  });

  it('unchecking removes the done class and persists the new state', async () => {
    const user = userEvent.setup();
    render(<Checklist items={items} semaine="S39" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Préparer les repas' });
    await user.click(checkbox);
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(getChecks('S39')).toEqual({ 'repas-a': false });
    expect(screen.getByText('Préparer les repas').closest('label')).not.toHaveClass('done');
  });

  it('renders pre-existing checks as checked', () => {
    setCheck('S39', 'course-b', true);
    render(<Checklist items={items} semaine="S39" />);
    expect(screen.getByRole('checkbox', { name: 'Faire les courses' })).toBeChecked();
    expect(screen.getByText('Faire les courses').closest('label')).toHaveClass('done');
  });

  it('re-reads storage when the semaine prop changes and keeps weeks isolated', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Checklist items={items} semaine="S39" />);
    await user.click(screen.getByRole('checkbox', { name: 'Préparer les repas' }));
    expect(getChecks('S39')).toEqual({ 'repas-a': true });

    rerender(<Checklist items={items} semaine="S40" />);
    expect(screen.getByRole('checkbox', { name: 'Préparer les repas' })).not.toBeChecked();
    expect(screen.getByText('Préparer les repas').closest('label')).not.toHaveClass('done');

    await user.click(screen.getByRole('checkbox', { name: 'Faire les courses' }));
    expect(getChecks('S40')).toEqual({ 'course-b': true });
    expect(getChecks('S39')).toEqual({ 'repas-a': true });
  });
});

describe('Sparkline', () => {
  it('shows a hint and no svg with fewer than 2 values', () => {
    const { container } = render(<Sparkline values={[80.5]} />);
    expect(screen.getByText('Ajoutez au moins 2 pesées.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders a polyline with one point per value, scaled 0-100, colored', () => {
    const { container } = render(<Sparkline values={[80.5, 82, 81]} color="#ff8800" />);
    const svg = screen.getByRole('img', { name: 'évolution du poids' });
    expect(container.querySelector('svg')).toBe(svg);
    const polyline = svg.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline!.getAttribute('stroke')).toBe('#ff8800');

    const pairs = polyline!.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
    expect(pairs).toHaveLength(3);
    expect(pairs.map(([x]) => x)).toEqual([0, 50, 100]);
    const ys = pairs.map(([, y]) => y);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(100);
  });

  it('defaults to the brand color', () => {
    const { container } = render(<Sparkline values={[1, 2]} />);
    expect(container.querySelector('polyline')!.getAttribute('stroke')).toBe('#5c6bc0');
  });
});

const courseItems: CourseItem[] = [
  { id: 'courses:proteines:poulet', rayon: 'proteines', label: 'Poulet' },
  { id: 'courses:proteines:oeufs', rayon: 'proteines', label: 'Œufs' },
  { id: 'courses:laitiers:yaourts', rayon: 'laitiers', label: 'Yaourts' },
  { id: 'courses:proteines:tofu', rayon: 'proteines', label: 'Tofu' },
];

describe('ShoppingList', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('groups items by rayon in first-appearance order', () => {
    render(<ShoppingList items={courseItems} semaine="S39" />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(['Proteines', 'Laitiers']);
    const proteines = screen.getByRole('heading', { name: 'Proteines' }).closest('section')!;
    expect(within(proteines).getAllByRole('checkbox')).toHaveLength(3);
    const laitiers = screen.getByRole('heading', { name: 'Laitiers' }).closest('section')!;
    expect(within(laitiers).getAllByRole('checkbox')).toHaveLength(1);
  });

  it('renders 0/4 cochés and a native progress bar initially', () => {
    render(<ShoppingList items={courseItems} semaine="S39" />);
    expect(screen.getByText('0/4 cochés')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '4');
  });

  it('updates the progress live when items are checked', async () => {
    const user = userEvent.setup();
    render(<ShoppingList items={courseItems} semaine="S39" />);
    await user.click(screen.getByRole('checkbox', { name: 'Poulet' }));
    await user.click(screen.getByRole('checkbox', { name: 'Yaourts' }));
    expect(screen.getByText('2/4 cochés')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2');
  });

  it('does not resurrect stale checks from another group after unchecking', async () => {
    const user = userEvent.setup();
    setCheck('S39', 'courses:proteines:poulet', true);
    render(<ShoppingList items={courseItems} semaine="S39" />);
    expect(screen.getByText('1/4 cochés')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Poulet' }));
    expect(screen.getByText('0/4 cochés')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Yaourts' }));
    expect(screen.getByText('1/4 cochés')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  });

  it('persists checked items via storage', async () => {
    const user = userEvent.setup();
    render(<ShoppingList items={courseItems} semaine="S39" />);
    await user.click(screen.getByRole('checkbox', { name: 'Poulet' }));
    expect(getChecks('S39')).toEqual({ 'courses:proteines:poulet': true });
  });

  it('renders a muted message and no sections when there are no items', () => {
    const { container } = render(<ShoppingList items={[]} semaine="S39" />);
    expect(screen.getByText('Aucune course pour cette semaine.')).toBeInTheDocument();
    expect(container.querySelector('section.course-group')).toBeNull();
    expect(container.querySelector('.progress')).toBeNull();
    expect(container.querySelector('progress')).toBeNull();
  });

  it('affiche la miniature photo du rayon dans l’en-tête du groupe', () => {
    render(
      <ShoppingList
        semaine="2026-S39"
        items={[
          { id: 'courses:legumes:a', rayon: 'legumes', label: 'Épinards' },
          { id: 'courses:inconnu:b', rayon: 'surgelés', label: 'Glace' },
        ]}
      />,
    );

    const legumes = screen.getByAltText('Legumes');
    expect(legumes).toHaveAttribute('loading', 'lazy');
    expect(screen.getByAltText('Surgelés')).toBeInTheDocument(); // fallback appliqué
  });

  it('capitalizes the rayon slug', () => {    render(
      <ShoppingList
        items={[{ id: 'courses:epicerie:sel', rayon: 'epicerie', label: 'Sel' }]}
        semaine="S39"
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Epicerie' })).toBeInTheDocument();
  });
});

const menuFixture: MenuDay[] = [
  {
    jour: 'Lundi',
    dejeunerMarc: "Flocons d'avoine",
    dejeunerMelanie: 'Skyr et fruits rouges',
    dinerFamille: 'Poulet rôti et légumes',
    dinerMelanie: 'Saumon et brocoli',
    batch: 'Quinoa',
  },
  { jour: 'Mardi', dejeunerMarc: 'Œufs brouillés' },
  { jour: 'Mercredi', dinerFamille: 'Pâtes carbonara' },
];

describe('MenuView', () => {
  it('renders one card per day with the day name in an h3', () => {
    vi.setSystemTime(new Date('2026-09-21T10:00:00')); // lundi : jour courant en tête, ordre conservé
    const { container } = render(<MenuView menu={menuFixture} />);
    expect(container.querySelectorAll('section.menu-day')).toHaveLength(3);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(['Lundi', 'Mardi', 'Mercredi']);
  });

  it('renders present fields as profile tags in spec order and hides absent ones', () => {
    render(<MenuView menu={menuFixture} />);
    const lundi = screen.getByRole('heading', { name: 'Lundi' }).closest('section')!;
    const rows = Array.from(lundi.querySelectorAll('.menu-row'));
    expect(rows.map((el) => el.querySelector('.menu-tag')!.textContent)).toEqual([
      'Marc',
      'Mé',
      'Famille',
      'Mé',
      'Batch',
    ]);
    expect(rows.map((el) => el.querySelector('.menu-row-text')!.textContent)).toEqual([
      "Flocons d'avoine",
      'Skyr et fruits rouges',
      'Poulet rôti et légumes',
      'Saumon et brocoli',
      'Quinoa',
    ]);

    const mardi = screen.getByRole('heading', { name: 'Mardi' }).closest('section')!;
    expect(mardi.querySelectorAll('.menu-row')).toHaveLength(1);
    expect(mardi.querySelector('.menu-row .menu-tag')!.textContent).toBe('Marc');
    expect(mardi.querySelector('.menu-row .menu-row-text')!.textContent).toBe('Œufs brouillés');
    expect(mardi.querySelector('.menu-tag.tag-keto')).toBeNull();
    expect(mardi.querySelector('.menu-tag.tag-bat')).toBeNull();
  });

  it('highlights the current day card with the today class and badge', () => {
    vi.useFakeTimers();
    // Utiliser la forme `T10:00:00` (parse en heure locale), pas la forme date-only (parse en UTC).
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    render(<MenuView menu={menuFixture} />);

    const mardi = screen.getByRole('heading', { name: 'Mardi' }).closest('section')!;
    expect(mardi).toHaveClass('today');
    expect(within(mardi).getByText("Aujourd'hui")).toHaveClass('today-badge');

    const lundi = screen.getByRole('heading', { name: 'Lundi' }).closest('section')!;
    expect(lundi).not.toHaveClass('today');
    expect(within(lundi).queryByText("Aujourd'hui")).toBeNull();

    const mercredi = screen.getByRole('heading', { name: 'Mercredi' }).closest('section')!;
    expect(mercredi).not.toHaveClass('today');
    expect(within(mercredi).queryByText("Aujourd'hui")).toBeNull();
  });

  it('renders a muted message and no cards when the menu is empty', () => {
    const { container } = render(<MenuView menu={[]} />);
    expect(screen.getByText('Aucun menu pour cette semaine.')).toBeInTheDocument();
    expect(container.querySelector('section.menu-day')).toBeNull();
  });

  it('does not mark any card as today when the current day is absent from the menu', () => {
    vi.useFakeTimers();
    // Utiliser la forme `T10:00:00` (parse en heure locale), pas la forme date-only (parse en UTC).
    vi.setSystemTime(new Date('2026-09-22T10:00:00'));
    const { container } = render(
      <MenuView
        menu={[
          { jour: 'Lundi', dejeunerMarc: 'Flocons' },
          { jour: 'Mercredi', dinerFamille: 'Pâtes' },
        ]}
      />,
    );
    expect(container.querySelector('section.menu-day.today')).toBeNull();
    expect(container.querySelector('.today-badge')).toBeNull();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe('MenuView v2', () => {
  const MENU: MenuDay[] = [
    { jour: 'Lundi', dejeunerMarc: 'Boîte dinde', dinerFamille: 'Poulet rôties', recetteRefs: { dinerFamille: 'R1' } },
    { jour: 'Mardi', dinerFamille: 'Gratin' },
    { jour: 'Mercredi', dinerFamille: 'Omelette' },
    { jour: 'Jeudi', dinerFamille: 'Wok' },
    { jour: 'Vendredi', dinerFamille: 'Tacos' },
    { jour: 'Samedi', dinerFamille: 'Soupe' },
    { jour: 'Dimanche', dinerFamille: 'Rôti de dinde' },
  ];

  it('commence la liste par le jour courant puis boucle (mercredi simulé)', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    render(<MenuView menu={MENU} />);
    const jours = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(jours).toEqual(['Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi']);
  });

  it('marque les jours passés (avant aujourd’hui) avec la classe past', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    render(<MenuView menu={MENU} />);
    expect(screen.getByText('Lundi', { selector: '.menu-day.past h3' })).toBeInTheDocument();
    expect(screen.getByText('Mardi', { selector: '.menu-day.past h3' })).toBeInTheDocument();
    expect(screen.getByText('Mercredi', { selector: '.menu-day.today h3' })).toBeInTheDocument();
    expect(screen.getAllByText('Passé')).toHaveLength(2);
  });

  it('affiche des tags de profil au lieu des labels longs', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    render(<MenuView menu={MENU} />);
    const lundi = screen.getByText('Lundi', { selector: '.menu-day.past h3' }).closest('section')!;
    expect(lundi.querySelector('.menu-tag.tag-marc')!.textContent).toBe('Marc');
    expect(lundi.querySelector('.menu-tag.tag-fam')!.textContent).toBe('Famille');
    expect(screen.getAllByText('Famille', { selector: '.menu-tag' })).toHaveLength(7);
    expect(screen.queryByText(/Déjeuner Marc/)).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe('BatchView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the banner and the checklist items', () => {
    render(<BatchView items={items} semaine="S39" />);
    expect(screen.getByText('Gros batch : dimanche, 45-60 min')).toHaveClass('batch-banner');
    expect(screen.getByRole('checkbox', { name: 'Préparer les repas' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Faire les courses' })).toBeInTheDocument();
  });

  it('renders a muted message and no banner when there are no items', () => {
    const { container } = render(<BatchView items={[]} semaine="S39" />);
    expect(screen.getByText('Aucun batch prévu cette semaine.')).toBeInTheDocument();
    expect(container.querySelector('.batch-banner')).toBeNull();
    expect(container.querySelector('ul.checklist')).toBeNull();
  });
});

const profileData: ProfileData = {
  cibles: ['Objectif 10 000 pas / jour', 'Protéines à chaque repas'],
  seances: [
    { id: 'seance-fullbody-a', label: 'Full body A' },
    { id: 'seance-cardio-30', label: 'Cardio 30 min' },
  ],
  rappels: ['Pesée chaque matin', '3 L d’eau par jour'],
};

describe('ProfileView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the title matching the profile', () => {
    const { unmount } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Marc — Diet & Sport' })).toBeInTheDocument();
    unmount();
    render(<ProfileView profileKey="melanie" data={profileData} semaine="S39" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Mélanie — Keto & Sport' })).toBeInTheDocument();
  });

  it('renders cibles and rappels as list items with the exact strings', () => {
    const { container } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const cibles = Array.from(container.querySelectorAll('ul.target-list > li')).map((li) => li.textContent);
    expect(cibles).toEqual(profileData.cibles);
    const rappels = Array.from(container.querySelectorAll('ul.rappel-list > li')).map((li) => li.textContent);
    expect(rappels).toEqual(profileData.rappels);
  });

  it('renders the seances checklist and persists a toggle', async () => {
    const user = userEvent.setup();
    render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Full body A' });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(getChecks('S39')).toEqual({ 'seance-fullbody-a': true });
  });

  it('adds a weight, shows it newest-first in the history and stores it', () => {
    addWeight('marc', '2026-09-05', 77.4);
    const { container } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const dateInput = container.querySelector('input[name="date"]') as HTMLInputElement;
    const kgInput = container.querySelector('input[name="kg"]') as HTMLInputElement;
    expect(dateInput.value).toBe(todayISO());

    fireEvent.change(dateInput, { target: { value: '2026-09-07' } });
    fireEvent.change(kgInput, { target: { value: '76.8' } });
    // userEvent.click sur le bouton submit ne déclenche pas onSubmit sous happy-dom.
    fireEvent.submit(container.querySelector('form')!);

    const lis = Array.from(container.querySelectorAll('ul.weight-list > li')).map((li) => li.textContent);
    expect(lis).toEqual(['07/09 — 76.8 kg', '05/09 — 77.4 kg']);
    expect(getWeights('marc')).toEqual([
      { date: '2026-09-05', kg: 77.4 },
      { date: '2026-09-07', kg: 76.8 },
    ]);
    expect(kgInput.value).toBe('');
    expect(dateInput.value).toBe('2026-09-07');
  });

  it.each(['', 'abc', '-1'])('rejects invalid weight %j and stores nothing', (raw) => {
    const { container } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const kgInput = container.querySelector('input[name="kg"]') as HTMLInputElement;
    fireEvent.change(kgInput, { target: { value: raw } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Poids invalide.');
    expect(getWeights('marc')).toEqual([]);
  });

  it('replaces the entry when the same date is submitted twice', () => {
    const { container } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const dateInput = container.querySelector('input[name="date"]') as HTMLInputElement;
    const kgInput = container.querySelector('input[name="kg"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-07' } });

    const form = container.querySelector('form')!;
    fireEvent.change(kgInput, { target: { value: '76.8' } });
    fireEvent.submit(form);
    fireEvent.change(kgInput, { target: { value: '77.2' } });
    fireEvent.submit(form);

    const lis = Array.from(container.querySelectorAll('ul.weight-list > li')).map((li) => li.textContent);
    expect(lis).toEqual(['07/09 — 77.2 kg']);
    expect(getWeights('marc')).toEqual([{ date: '2026-09-07', kg: 77.2 }]);
  });

  it('re-syncs per-profile state when profileKey changes without remount', () => {
    addWeight('marc', '2026-09-05', 77.4);
    const { container, rerender } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    fireEvent.submit(container.querySelector('form')!); // kg vide -> erreur
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<ProfileView profileKey="melanie" data={profileData} semaine="S39" />);
    expect(container.querySelectorAll('ul.weight-list > li')).toHaveLength(0);
    expect(screen.queryByText('05/09 — 77.4 kg')).not.toBeInTheDocument();
    expect(screen.getByText('Ajoutez au moins 2 pesées.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const lis = Array.from(container.querySelectorAll('ul.weight-list > li')).map((li) => li.textContent);
    expect(lis).toEqual(['05/09 — 77.4 kg']);
  });

  it('clears the error when the kg input changes', () => {
    const { container } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    fireEvent.submit(container.querySelector('form')!); // kg vide -> erreur
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(container.querySelector('input[name="kg"]')!, { target: { value: '76.8' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exposes the date and kg inputs with dedicated classes and aria-labels', () => {
    const { container } = render(<ProfileView profileKey="marc" data={profileData} semaine="S39" />);
    const dateInput = container.querySelector('input[name="date"]')!;
    expect(dateInput).toHaveClass('weight-date');
    expect(dateInput).toHaveAttribute('aria-label', 'Date de la pesée');
    const kgInput = container.querySelector('input[name="kg"]')!;
    expect(kgInput).toHaveAttribute('aria-label', 'Poids (kg)');
    expect(container.querySelector('form')).toHaveClass('weight-form');
  });

  it('shows the sparkline hint when there are fewer than 2 entries', () => {
    const { container } = render(<ProfileView profileKey="melanie" data={profileData} semaine="S39" />);
    expect(screen.getByText('Ajoutez au moins 2 pesées.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders the sparkline svg with the profile accent once there are 2+ entries', () => {
    addWeight('melanie', '2026-09-06', 64.2);
    addWeight('melanie', '2026-09-07', 63.8);
    const { container } = render(<ProfileView profileKey="melanie" data={profileData} semaine="S39" />);
    const svg = screen.getByRole('img', { name: 'évolution du poids' });
    expect(container.querySelector('svg')).toBe(svg);
    expect(svg.querySelector('polyline')!.getAttribute('stroke')).toBe('#3d9a6c');
  });

  it('todayISO returns the local calendar date as YYYY-MM-DD', () => {
    vi.useFakeTimers();
    // Utiliser la forme `T10:00:00` (parse en heure locale), pas la forme date-only (parse en UTC).
    vi.setSystemTime(new Date('2026-09-07T23:30:00'));
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    expect(todayISO()).toBe(expected);
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe('WeekBanner', () => {
  it('affiche le menu courant en pill à côté du titre', () => {
    render(
      <WeekBanner meta={{ semaine: '2026-S39', menu: 'A', du: '2026-09-21', au: '2026-09-27' }} />,
    );
    const pill = screen.getByText('Menu A');
    expect(pill).toHaveClass('menu-pill');
    expect(pill.parentElement).toHaveClass('week-title-row');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S39');
  });
});
