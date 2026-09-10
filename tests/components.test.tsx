import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  BaseCuisine,
  ChecklistItem,
  CourseItem,
  MenuDay,
  ProfileData,
  Recette,
  WeeklyData,
} from '../src/lib/model';
import { addWeight, getChecks, getWeights, loadWeeks, setCheck, upsertWeek } from '../src/lib/storage';
import { todayISO } from '../src/lib/dates';
import { parseWeeklyFile } from '../src/lib/parse';
import { ImportButton } from '../src/components/ImportButton';
import { Checklist } from '../src/components/Checklist';
import { StatCards } from '../src/components/StatCards';
import { WeightChart } from '../src/components/WeightChart';
import { ShoppingList } from '../src/components/cuisine/ShoppingList';
import { MenuView } from '../src/components/cuisine/MenuView';
import { BatchView } from '../src/components/cuisine/BatchView';
import { CuisineView } from '../src/components/cuisine/CuisineView';
import { ProfileView } from '../src/components/ProfileView';
import { WeekBanner } from '../src/components/WeekBanner';
import { Icon } from '../src/components/Icon';

const items: ChecklistItem[] = [
  { id: 'repas-a', label: 'Préparer les repas' },
  { id: 'course-b', label: 'Faire les courses' },
];

// Mini-semaine valide : doit parser avec 0 warning (toutes les sections, aucune
// ligne hors format).
const mdSemaine = (semaine: string, du: string, au: string, menu = 'A', plat = 'Poulet rôti') =>
  `---
semaine: ${semaine}
menu: ${menu}
du: ${du}
au: ${au}
---

## Courses

### Proteines
- [ ] ${plat} 600 g

### Keto
- [ ] Avocats ×3-4

## Menu

### Lundi
- dejeuner-marc: ${plat}
- dejeuner-melanie: ${plat} version keto
- diner-famille: ${plat} au four
- diner-melanie: ${plat} version keto
- batch: Doubler ${plat}

### Mardi
- dejeuner-marc: Restes de ${plat}
- dejeuner-melanie: Box ${plat}
- diner-famille: ${plat} pâtes
- diner-melanie: ${plat} sans pâtes

## Batch

### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10

### Micro-batch
- lundi: doubler le plat

- [ ] Egg muffins ×10

## Marc

### Cibles
- 2 450 kcal

### Seances
- [ ] Lundi — Muscu

### Rappels
- Pesée lun/mer/ven

## Melanie

### Cibles
- 1 450 kcal

### Seances
- [ ] Mardi — Pilates

### Rappels
- Jeûne 16:8
`;

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

describe('WeightChart', () => {
  const base = [
    { date: '2026-01-05', kg: 85 },
    { date: '2026-03-02', kg: 82 },
    { date: '2026-05-04', kg: 80.5 },
    { date: '2026-09-07', kg: 78 },
  ];

  it('affiche départ, actuel, objectif et les dates d axe', () => {
    render(<WeightChart weights={base} objectif={72} />);
    expect(screen.getAllByText('85 kg').length).toBeGreaterThanOrEqual(1); // chip + point de départ
    expect(screen.getAllByText('78 kg').length).toBeGreaterThanOrEqual(1); // chip + point actuel
    expect(screen.getByText('72 kg')).toBeInTheDocument(); // objectif (chip seul)
    expect(screen.getByText(/05\/01/)).toBeInTheDocument(); // 1re pesée
    expect(screen.getByText(/07\/09/)).toBeInTheDocument(); // dernière
    expect(screen.getByRole('img', { name: /courbe de poids/i })).toBeInTheDocument();
  });

  it('affiche « — » à la place de l objectif absent', () => {
    render(<WeightChart weights={base} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('invite à ajouter des pesées en dessous de 2 points', () => {
    render(<WeightChart weights={[{ date: '2026-09-07', kg: 78 }]} />);
    expect(screen.getByText(/Ajoutez au moins 2 pesées/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('gère deux pesées identiques sans NaN dans la courbe', () => {
    const { container } = render(
      <WeightChart weights={[{ date: '2026-09-06', kg: 78 }, { date: '2026-09-07', kg: 78 }]} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('.weight-ligne')!.getAttribute('d')).not.toContain('NaN');
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

  it('affiche un compteur fait/total par rayon', () => {
    render(
      <ShoppingList
        semaine="2026-S39"
        items={[
          { id: 'courses:legumes:a', rayon: 'legumes', label: 'Épinards' },
          { id: 'courses:legumes:b', rayon: 'legumes', label: 'Carottes' },
          { id: 'courses:fruits:c', rayon: 'fruits', label: 'Pommes' },
        ]}
      />,
    );
    expect(screen.getByText('0/2', { selector: '.rayon-cnt' })).toBeInTheDocument();
    expect(screen.getByText('0/1', { selector: '.rayon-cnt' })).toBeInTheDocument();
  });

  it('met à jour le compteur du rayon après un clic, y compris celui du rayon keto', async () => {
    const user = userEvent.setup();
    render(
      <ShoppingList
        semaine="2026-S39"
        items={[
          { id: 'courses:keto:avocats', rayon: 'keto', label: 'Avocats ×3-4' },
          { id: 'courses:legumes:a', rayon: 'legumes', label: 'Épinards' },
          { id: 'courses:legumes:b', rayon: 'legumes', label: 'Carottes' },
        ]}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Épinards' }));
    expect(screen.getByText('1/2', { selector: '.rayon-cnt' })).toBeInTheDocument();
    expect(screen.getByText('0/1', { selector: '.rayon-cnt' })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Avocats ×3-4' }));
    expect(screen.getByText('1/1', { selector: '.rayon-cnt' })).toBeInTheDocument();
  });

  it('rend le rayon Keto en encadré dédié, en dernier', () => {
    render(
      <ShoppingList
        semaine="2026-S39"
        items={[
          { id: 'courses:keto:avocats', rayon: 'keto', label: 'Avocats ×3-4' },
          { id: 'courses:legumes:a', rayon: 'legumes', label: 'Épinards' },
        ]}
      />,
    );
    expect(screen.getByText('Les extras keto de Mélanie')).toBeInTheDocument();
    const keto = screen.getByText('Les extras keto de Mélanie').closest('section');
    const legumes = screen.getByText('Legumes').closest('section');
    // keto suit legumes dans l'ordre du document : encadré en DERNIERE position
    expect(legumes!.compareDocumentPosition(keto!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(keto).toHaveClass('keto-box');
    expect(screen.queryByAltText('Keto')).not.toBeInTheDocument();
  });

  it('le rayon keto se coche comme un rayon normal et persiste', async () => {
    const user = userEvent.setup();
    render(
      <ShoppingList
        semaine="2026-S39"
        items={[{ id: 'courses:keto:avocats', rayon: 'keto', label: 'Avocats ×3-4' }]}
      />,
    );
    const avocats = screen.getByRole('checkbox', { name: 'Avocats ×3-4' });
    await user.click(avocats);
    expect(avocats).toBeChecked();
    expect(getChecks('2026-S39')).toEqual({ 'courses:keto:avocats': true });
    await user.click(avocats);
    expect(avocats).not.toBeChecked();
    expect(getChecks('2026-S39')).toEqual({ 'courses:keto:avocats': false });
  });

  it('affiche la bannière rituel avec le budget de la semaine', () => {
    render(<ShoppingList items={courseItems} semaine="2026-S37" budget="≈ 35 €" />);
    const ban = document.querySelector('.batch-banner');
    expect(ban).not.toBeNull();
    expect(ban).toHaveTextContent(/Pensées pour le rituel/);
    expect(ban).toHaveTextContent('≈ 35 €');
  });

  it('n’affiche pas de budget quand la semaine n’en a pas', () => {
    render(<ShoppingList items={courseItems} semaine="2026-S37" />);
    const ban = document.querySelector('.batch-banner');
    expect(ban).toHaveTextContent(/Pensées pour le rituel/);
    expect(ban?.textContent).not.toContain('€');
  });

  it('affiche le marqueur rituel et la note sur les items concernés', () => {
    const itemsMarques = [
      { id: 'courses:p:poulet', rayon: 'proteines', label: 'Poulet — 1 kg', rituel: true },
      {
        id: 'courses:p:saumon',
        rayon: 'proteines',
        label: 'Pavés de saumon — 2',
        note: 'poisson frais : vendredi, pas avant',
      },
    ];
    render(<ShoppingList items={itemsMarques} semaine="2026-S37" />);
    expect(document.querySelector('.item-rituel')).toHaveTextContent('rituel');
    expect(document.querySelector('.item-note')).toHaveTextContent('poisson frais : vendredi, pas avant');
  });

  it('Mode magasin masque les items cochés ; Tout revoir les remontre', async () => {
    const user = userEvent.setup();
    render(<ShoppingList items={courseItems} semaine="2026-S37" />);
    await user.click(screen.getAllByRole('checkbox')[0]!);
    const cochesAvant = screen.getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked);
    expect(cochesAvant.length).toBe(1);
    await user.click(screen.getByRole('button', { name: /Mode magasin/ }));
    expect(screen.getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByRole('button', { name: /Tout revoir/ }));
    expect(screen.getAllByRole('checkbox').length).toBe(courseItems.length);
  });

  it('Mode magasin : tout coché affiche le message de fin, décocher un item le retire', async () => {
    const user = userEvent.setup();
    render(<ShoppingList items={courseItems} semaine="2026-S37" />);
    for (const nom of ['Poulet', 'Œufs', 'Yaourts', 'Tofu']) {
      await user.click(screen.getByRole('checkbox', { name: nom }));
    }
    await user.click(screen.getByRole('button', { name: /Mode magasin/ }));
    expect(screen.getByText('Tout est coché — bonne course 👋')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tout revoir/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Poulet' }));
    expect(screen.queryByText('Tout est coché — bonne course 👋')).not.toBeInTheDocument();
  });

  it('Mode magasin : un rayon entièrement coché disparaît, les autres restent', async () => {
    const user = userEvent.setup();
    render(<ShoppingList items={courseItems} semaine="2026-S37" />);
    for (const nom of ['Poulet', 'Œufs', 'Tofu']) {
      await user.click(screen.getByRole('checkbox', { name: nom }));
    }
    await user.click(screen.getByRole('button', { name: /Mode magasin/ }));
    expect(screen.queryByRole('heading', { name: 'Proteines' })).toBeNull();
    expect(screen.queryByAltText('Proteines')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Laitiers' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Yaourts' })).toBeInTheDocument();
  });

  it('Mode magasin : l’état coché survit à « Tout revoir »', async () => {
    const user = userEvent.setup();
    render(<ShoppingList items={courseItems} semaine="2026-S37" />);
    await user.click(screen.getByRole('checkbox', { name: 'Poulet' }));
    await user.click(screen.getByRole('button', { name: /Mode magasin/ }));
    await user.click(screen.getByRole('button', { name: /Tout revoir/ }));
    expect(screen.getByRole('checkbox', { name: 'Poulet' })).toBeChecked();
    expect(screen.getByText('1/4 cochés')).toBeInTheDocument();
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

describe('CuisineView — sous-onglets', () => {
  const data: WeeklyData = {
    meta: { semaine: 'S40', menu: 'A', du: '2026-09-28', au: '2026-10-04' },
    courses: [],
    menu: [
      { jour: 'Lundi', dejeunerMarc: "Flocons d'avoine" },
      { jour: 'Mardi', dinerFamille: 'Poulet rôti' },
    ],
    batch: [],
    profiles: { marc: { cibles: [], seances: [], rappels: [] }, melanie: { cibles: [], seances: [], rappels: [] } },
  };

  it('affiche 3 onglets texte seul (sans emoji) et met le premier en actif', () => {
    render(<CuisineView data={data} />);
    expect(screen.getByRole('button', { name: 'Courses' })).toHaveClass('tab', 'active');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('tab');
    expect(screen.getByRole('button', { name: 'Batch' })).toHaveClass('tab');
    expect(screen.queryByRole('button', { name: /🛒/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /📅/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /📦/ })).not.toBeInTheDocument();
  });

  it('bascule la classe active au clic et change de section', async () => {
    const user = userEvent.setup();
    render(<CuisineView data={data} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('tab', 'active');
    expect(screen.getByRole('button', { name: 'Courses' })).not.toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Lundi', level: 3 })).toBeInTheDocument();
  });
});

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
      'Mél',
      'Famille',
      'Mél',
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

describe('MenuView — carte recette', () => {
  const RECETTES: Recette[] = [
    {
      id: 'r2-pates-bolognaise-salade',
      nom: 'R2 · Pâtes bolognaise + salade',
      temps: '25 min · plaque + casserole',
      kcal: 620,
      proteines: 42,
      pour: '800 g haché 5 % · 2 boîtes tomates · 400 g pâtes',
      bases: ['B4', 'B6'],
      etapes: ["Oignons + ail à l'huile 5 min, haché 8 min.", 'Tomates + herbes, 15 min doux.'],
      mel: 'bolo sur courgettes spaghetti + parmesan',
      batch: 'double sauce → boîte mercredi',
    },
    { id: 'r4-wok', nom: 'R4 · Wok poulet', temps: '12 min', etapes: ['Wok bien chaud.'], mel: 'sans riz' },
  ];
  const BASES: BaseCuisine[] = [
    {
      id: 'b4-vinaigrette-minute',
      nom: 'B4 · Vinaigrette minute',
      texte: "3 c.à.s huile d'olive + 1 moutarde + jus d'½ citron + sel.",
    },
    {
      id: 'b6-courgettes-spaghetti',
      nom: 'B6 · Courgettes spaghetti',
      texte: "Julienne à l'économe, 3-4 min poêle très chaude.",
    },
  ];
  const MENU: MenuDay[] = [
    { jour: 'Mercredi', dinerFamille: 'Pâtes bolognaise + salade', recetteRefs: { dinerFamille: 'R2' } },
    { jour: 'Jeudi', dinerFamille: 'Wok poulet', recetteRefs: { dinerFamille: 'R4' } },
  ];

  const renderMenu = (over: { menu?: MenuDay[]; recettes?: Recette[]; bases?: BaseCuisine[] } = {}) =>
    render(<MenuView menu={over.menu ?? MENU} recettes={over.recettes ?? RECETTES} bases={over.bases ?? BASES} />);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche une carte compacte repliée sous chaque repas avec ref (badge catégorie + footer nutrition)', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu();

    const cartes = screen.getAllByRole('article');
    expect(cartes).toHaveLength(2);
    const carteR2 = screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' });
    expect(carteR2.querySelector('.recette-nom')!.textContent).toBe('R2 · Pâtes bolognaise + salade');
    expect(carteR2.querySelector('.recette-badge-cat')!.textContent).toBe('Famille');
    expect(carteR2.querySelector('.recette-badge-info')!.textContent).toBe('⏱ 25 min');
    expect(screen.getByText('🔥 620 kcal')).toBeInTheDocument();
    expect(screen.getByText('💪 42g P')).toBeInTheDocument();
    expect(screen.queryByText(/~620|\/pers/)).not.toBeInTheDocument();

    const toggle = within(carteR2).getByRole('button', { name: 'Voir la recette ⌄' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('déplie le détail via le bouton, referme par re-clic, indépendamment par carte', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu();

    const toggles = screen.getAllByRole('button', { name: 'Voir la recette ⌄' });
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]!);
    const carteR2 = screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' });
    expect(screen.getByRole('list')).toHaveClass('recette-etapes');
    expect(carteR2.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'true');

    const toggles2 = screen.getAllByRole('button', { name: 'Voir la recette ⌄' });
    await user.click(toggles2[0]!);
    const carteR4 = screen.getByRole('article', { name: 'R4 · Wok poulet' });
    expect(carteR4.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(carteR2.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('sans riz')).toBeInTheDocument();

    await user.click(carteR2.querySelector('.recette-toggle')!);
    expect(carteR2.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText("Oignons + ail à l'huile 5 min, haché 8 min.")).not.toBeInTheDocument();
    expect(screen.getByText('sans riz')).toBeInTheDocument();
  });

  it('affiche les étapes, bases cliquables et lignes mélanie/batch dans le détail', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getAllByRole('button', { name: 'Voir la recette ⌄' })[0]!);

    const etapes = screen.getByRole('list');
    expect(within(etapes).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      "Oignons + ail à l'huile 5 min, haché 8 min.",
      'Tomates + herbes, 15 min doux.',
    ]);
    expect(screen.getByText('bolo sur courgettes spaghetti + parmesan')).toHaveClass('recette-ligne', 'recette-mel');
    expect(screen.getByText('double sauce → boîte mercredi')).toHaveClass('recette-ligne', 'recette-bat');

    const chipB4 = screen.getByRole('button', { name: /B4 · Vinaigrette minute/ });
    await user.click(chipB4);
    expect(screen.getByText(/huile d'olive \+ 1 moutarde/)).toBeInTheDocument();
    await user.click(chipB4);
    expect(screen.queryByText(/huile d'olive \+ 1 moutarde/)).not.toBeInTheDocument();
  });

  it('affiche le score inline (Health score : N/10 + barre) et le sans-score omis', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu({
      menu: [
        { jour: 'Lundi', dejeunerMarc: 'Poulet', recetteRefs: { dejeunerMarc: 'r1' } },
        { jour: 'Mardi', dejeunerMarc: 'Gratin', recetteRefs: { dejeunerMarc: 'r2-sans' } },
      ],
      recettes: [
        { id: 'r1', nom: 'Poulet rôti', kcal: 450, proteines: 35, glucides: 30, lipides: 12, score: 9 },
        { id: 'r2-sans', nom: 'Gratin sans score', kcal: 500 },
      ],
    });

    expect(screen.getByText('Health score :')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('/10')).toBeInTheDocument();
    const barre = screen.getByTestId('score-bar');
    expect(barre.children).toHaveLength(10);
    expect(barre.querySelectorAll('.score-seg.on')).toHaveLength(9);

    const carteSans = screen.getByRole('article', { name: 'Gratin sans score' });
    expect(carteSans.querySelector('.recette-score')).toBeNull();
  });

  it('affiche la photo ou le fallback sans clic préalable', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu({
      menu: [
        { jour: 'Lundi', dejeunerMarc: 'Poulet', recetteRefs: { dejeunerMarc: 'r1' } },
        { jour: 'Mardi', dejeunerMarc: 'Gratin', recetteRefs: { dejeunerMarc: 'r2-sans' } },
      ],
      recettes: [
        { id: 'r1', nom: 'Poulet rôti', image: 'https://images.unsplash.com/photo-x?w=800' },
        { id: 'r2-sans', nom: 'Gratin sans image' },
      ],
    });

    expect(screen.getByRole('img', { name: 'Poulet rôti' })).toHaveAttribute(
      'src',
      'https://images.unsplash.com/photo-x?w=800',
    );
    expect(screen.getByTestId('recette-fallback')).toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });

  it('ref non résolue : ni carte ni badge, texte du repas intact', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const { container } = renderMenu({
      menu: [{ jour: 'Mercredi', dinerFamille: 'Pâtes bolognaise + salade', recetteRefs: { dinerFamille: 'R99' } }],
    });

    expect(container.querySelector('.recette-card')).toBeNull();
    expect(screen.getByText('Pâtes bolognaise + salade')).toBeInTheDocument();
  });

  it('préfixe de recette borné : R1 ne matche pas une recette r10-…', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu({
      recettes: [{ id: 'r10-wok-special', nom: 'R10 · Wok spécial', temps: '10 min' }, ...RECETTES],
      menu: [{ jour: 'Mercredi', dinerFamille: 'Wok spécial', recetteRefs: { dinerFamille: 'R1' } }],
    });

    expect(screen.queryByRole('button', { name: /R10 · Wok spécial/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Wok spécial/ })).not.toBeInTheDocument();
    expect(screen.getByText('Wok spécial')).toBeInTheDocument();
  });

  it('base non résolue : détail sans chips, sans crash', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu({ recettes: [{ ...RECETTES[0]!, bases: ['B9'] }] });

    await user.click(screen.getAllByRole('button', { name: 'Voir la recette ⌄' })[0]!);

    expect(screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^B9/ })).not.toBeInTheDocument();
  });

  it('préfixe de base borné : B4 ne matche pas une base b40-…', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu({
      bases: [{ id: 'b40-houmous', nom: 'B40 · Houmous', texte: 'Pois chiches + tahini.' }, ...BASES],
    });

    await user.click(screen.getAllByRole('button', { name: 'Voir la recette ⌄' })[0]!);

    expect(screen.getByRole('button', { name: /B4 · Vinaigrette minute/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /B40 · Houmous/ })).not.toBeInTheDocument();
  });
});

describe('BatchView v2 — rituel et micro-batch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const RITUEL = [
    { id: 'batch:rituel:four-a-180', creneau: '0-5 min', label: 'Four à 180°', detail: 'egg muffins ×10 lancés' },
    { id: 'batch:rituel:cuissons', creneau: '5-30 min', label: 'Cuissons en double', detail: 'dîner ×2 + féculent ×2' },
  ];
  const MICRO = [
    { jour: 'lundi', quoi: 'doubler le plat' },
    { jour: 'mardi', quoi: 'doubler la sauce' },
  ];

  it('affiche le rituel en timeline avec créneaux, détails et compteur', () => {
    render(<BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />);
    expect(screen.getByText(/Rituel du dimanche/)).toBeInTheDocument();
    expect(screen.getByText('0-5 min')).toBeInTheDocument();
    expect(screen.getByText('Four à 180°')).toBeInTheDocument();
    expect(screen.getByText('egg muffins ×10 lancés')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('affiche le micro-batch en carrousel premium : badge jour + points de pagination', () => {
    const { container } = render(
      <BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />,
    );
    expect(screen.getByText(/Micro-batch de la semaine/)).toBeInTheDocument();
    const badge = screen.getByText('Lundi');
    expect(badge).toHaveClass('micro-jour-nom');
    expect(screen.getByText('doubler la sauce')).toBeInTheDocument();
    // seuls les étapes du rituel sont cochables
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    const dots = container.querySelectorAll('.micro-dots i');
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveClass('on');
    expect(dots[1]).not.toHaveClass('on');
  });

  it('cocher une étape du rituel persiste sous l’id batch:rituel:*', async () => {
    const user = userEvent.setup();
    render(<BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />);
    await user.click(screen.getByRole('checkbox', { name: 'Four à 180° (0-5 min)' }));
    expect(getChecks('2026-S39')).toEqual({ 'batch:rituel:four-a-180': true });
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Four à 180° (0-5 min)' })).toBeChecked();
  });

  it('affiche la timeline au-dessus du micro-batch, sans bannière ni checklist', () => {
    const { container } = render(
      <BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />,
    );
    const timeline = container.querySelector('.rituel-timeline');
    const micro = container.querySelector('.micro-batch');
    expect(timeline).not.toBeNull();
    expect(micro).not.toBeNull();
    expect(container.querySelector('.batch-banner')).toBeNull();
    expect(container.querySelector('ul.checklist')).toBeNull();
    expect(timeline!.compareDocumentPosition(micro!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sans rituel ni micro-batch : message muted seul', () => {
    const { container } = render(<BatchView semaine="2026-S39" />);
    expect(screen.getByText('Aucun batch prévu cette semaine.')).toBeInTheDocument();
    expect(container.querySelector('.batch-banner')).toBeNull();
    expect(container.querySelector('.rituel-timeline')).toBeNull();
    expect(container.querySelector('.micro-batch')).toBeNull();
  });

  it('rendu v1 identique : rien à batcher → message muted, ni timeline ni bannière', () => {
    const { container } = render(
      <BatchView rituel={[]} microBatch={[]} semaine="2026-S39" />,
    );
    expect(screen.getByText('Aucun batch prévu cette semaine.')).toBeInTheDocument();
    expect(container.querySelector('.batch-banner')).toBeNull();
    expect(container.querySelector('.rituel-timeline')).toBeNull();
    expect(container.querySelector('.micro-batch')).toBeNull();
  });

  it('resynchronise la timeline quand la semaine change (render-phase reset)', () => {
    const { rerender } = render(
      <BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />,
    );
    setCheck('2026-S39', 'batch:rituel:four-a-180', true);
    rerender(<BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S40" />);

    expect(screen.getByText('0/2')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Four à 180° (0-5 min)' })).not.toBeChecked();
    expect(getChecks('2026-S39')).toEqual({ 'batch:rituel:four-a-180': true });
    expect(getChecks('2026-S40')).toEqual({});
  });
});

describe('StatCards', () => {
  const data: WeeklyData = {
    meta: { semaine: '2026-S37', menu: 'A', du: '2026-09-07', au: '2026-09-13' },
    courses: [
      { id: 'courses:p:1', rayon: 'p', label: 'Poulet' },
      { id: 'courses:p:2', rayon: 'p', label: 'Riz' },
    ],
    menu: [{ jour: 'Mercredi', recetteRefs: { dejeunerMarc: 'r1', dinerFamille: 'r2' } }],
    batch: [],
    profiles: {
      marc: {
        cibles: [],
        seances: [
          { id: 's1', label: 'Full body' },
          { id: 's2', label: 'Cardio' },
        ],
        rappels: [],
      },
      melanie: { cibles: [], seances: [], rappels: [] },
    },
    recettes: [
      { id: 'r1', nom: 'R1', kcal: 680 },
      { id: 'r2', nom: 'R2', kcal: 620 },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date('2026-09-09T10:00:00')); // mercredi
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche poids, kcal du jour (menu du jour), séances et courses', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 77.4);
    setCheck('2026-S37', 's1', true);
    render(<StatCards data={data} profile={{ id: 'marc', age: 41, taille: 178 }} />);

    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('77,4')).toBeInTheDocument();
    expect(screen.getByText(/vs 7 j/)).toBeInTheDocument();
    expect(screen.getByText('Kcal du jour')).toBeInTheDocument();
    // toLocaleString('fr-FR') insère une espace fine insécable (U+202F) — \s la couvre
    expect(screen.getByText(/1\s?300/)).toBeInTheDocument();
    expect(screen.getByText('Séances')).toBeInTheDocument();
    expect(screen.getByText('/2')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('affiche la ligne objectif kcal quand le profil en a', () => {
    setCheck('2026-S37', 's1', true);
    render(
      <StatCards data={data} profile={{ id: 'marc', age: 41, taille: 178, kcalObjectif: 2000 }} />,
    );
    expect(screen.getByText(/objectif 2\s?000/)).toBeInTheDocument();
  });

  it('badge de variation : perte vers l’objectif → classe stat-delta-bon', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 77.4);
    render(
      <StatCards data={data} profile={{ id: 'marc', age: 41, taille: 178, poidsObjectif: 70 }} />,
    );
    expect(screen.getByText(/vs 7 j/)).toHaveClass('stat-delta-bon');
  });

  it('badge de variation : prise de poids vers l’objectif → classe stat-delta-alerte', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 78.5);
    render(
      <StatCards data={data} profile={{ id: 'marc', age: 41, taille: 178, poidsObjectif: 70 }} />,
    );
    expect(screen.getByText(/vs 7 j/)).toHaveClass('stat-delta-alerte');
  });

  it('poids et kcal sans données s’affichent en tiret (aucun crash)', () => {
    render(
      <StatCards data={{ ...data, menu: [] }} profile={{ id: 'melanie', age: 38, taille: 165 }} />,
    );
    const tirets = screen.getAllByText('—');
    expect(tirets.length).toBeGreaterThanOrEqual(2);
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
    const { unmount } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Marc — Diet & Sport' })).toBeInTheDocument();
    unmount();
    render(<ProfileView profile={{ id: 'melanie', age: 38, taille: 165 }} data={profileData} semaine="S39" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Mélanie — Keto & Sport' })).toBeInTheDocument();
  });

  it('renders cibles and rappels as list items with the exact strings', () => {
    const { container } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    const cibles = Array.from(container.querySelectorAll('ul.target-list > li')).map((li) => li.textContent);
    expect(cibles).toEqual(profileData.cibles);
    const rappels = Array.from(container.querySelectorAll('ul.rappel-list > li')).map((li) => li.textContent);
    expect(rappels).toEqual(profileData.rappels);
  });

  it('renders the seances checklist and persists a toggle', async () => {
    const user = userEvent.setup();
    render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Full body A' });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(getChecks('S39')).toEqual({ 'seance-fullbody-a': true });
  });

  it('adds a weight, shows it newest-first in the history and stores it', () => {
    addWeight('marc', '2026-09-05', 77.4);
    const { container } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
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
    const { container } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    const kgInput = container.querySelector('input[name="kg"]') as HTMLInputElement;
    fireEvent.change(kgInput, { target: { value: raw } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Poids invalide.');
    expect(getWeights('marc')).toEqual([]);
  });

  it('replaces the entry when the same date is submitted twice', () => {
    const { container } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
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

  it('re-syncs per-profile state when profile changes without remount', () => {
    addWeight('marc', '2026-09-05', 77.4);
    const { container, rerender } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    fireEvent.submit(container.querySelector('form')!); // kg vide -> erreur
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<ProfileView profile={{ id: 'melanie', age: 38, taille: 165 }} data={profileData} semaine="S39" />);
    expect(container.querySelectorAll('ul.weight-list > li')).toHaveLength(0);
    expect(screen.queryByText('05/09 — 77.4 kg')).not.toBeInTheDocument();
    expect(screen.getByText('Ajoutez au moins 2 pesées pour voir la courbe.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    const lis = Array.from(container.querySelectorAll('ul.weight-list > li')).map((li) => li.textContent);
    expect(lis).toEqual(['05/09 — 77.4 kg']);
  });

  it('clears the error when the kg input changes', () => {
    const { container } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    fireEvent.submit(container.querySelector('form')!); // kg vide -> erreur
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(container.querySelector('input[name="kg"]')!, { target: { value: '76.8' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exposes the date and kg inputs with dedicated classes and aria-labels', () => {
    const { container } = render(<ProfileView profile={{ id: 'marc', age: 41, taille: 178 }} data={profileData} semaine="S39" />);
    const dateInput = container.querySelector('input[name="date"]')!;
    expect(dateInput).toHaveClass('weight-date');
    expect(dateInput).toHaveAttribute('aria-label', 'Date de la pesée');
    const kgInput = container.querySelector('input[name="kg"]')!;
    expect(kgInput).toHaveAttribute('aria-label', 'Poids (kg)');
    expect(container.querySelector('form')).toHaveClass('weight-form');
  });

  it('shows the weight chart hint when there are fewer than 2 entries', () => {
    const { container } = render(<ProfileView profile={{ id: 'melanie', age: 38, taille: 165 }} data={profileData} semaine="S39" />);
    expect(screen.getByText('Ajoutez au moins 2 pesées pour voir la courbe.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders the weight curve (WeightChart) once there are 2+ entries', () => {
    addWeight('melanie', '2026-09-06', 64.2);
    addWeight('melanie', '2026-09-07', 63.8);
    const { container } = render(<ProfileView profile={{ id: 'melanie', age: 38, taille: 165 }} data={profileData} semaine="S39" />);
    expect(
      screen.getByRole('img', { name: 'Courbe de poids de 64.2 à 63.8 kg' }),
    ).toBeInTheDocument();
    expect(container.querySelector('svg path.weight-ligne')).not.toBeNull();
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
  const meta = { semaine: '2026-S39', menu: 'A', du: '2026-09-21', au: '2026-09-27' };

  it('affiche le menu courant en pill à côté du titre', () => {
    render(<WeekBanner meta={meta} />);
    const pill = screen.getByText('Menu A');
    expect(pill).toHaveClass('menu-pill');
    expect(pill.parentElement).toHaveClass('week-title-row');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S39');
  });

  it('chevrons absents sans callbacks (une seule semaine)', () => {
    render(<WeekBanner meta={meta} />);
    expect(screen.queryByRole('button', { name: 'Semaine précédente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Semaine suivante' })).toBeNull();
  });

  it('navigue par chevrons et désactive aux bornes', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<WeekBanner meta={meta} onPrev={onPrev} onNext={onNext} hasPrev={false} hasNext />);
    const prev = screen.getByRole('button', { name: 'Semaine précédente' });
    const next = screen.getByRole('button', { name: 'Semaine suivante' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    await user.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });
});

describe('ImportButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const fichier = (nom: string, contenu: string) =>
    new File([contenu], nom, { type: 'text/markdown' });

  // happy-dom 20 ne livre qu'un seul fichier via user.upload (FileList non
  // simulable) et window.confirm n'existe pas : exception fireEvent documentée
  // comme fireEvent.submit (cf. AGENTS.md).
  const uploader = async (input: HTMLInputElement, ...files: File[]) => {
    await act(async () => {
      fireEvent.change(input, { target: { files } });
    });
  };

  it('importe plusieurs fichiers en une fois et résume', async () => {
    const onImported = vi.fn();
    const { container } = render(<ImportButton onImported={onImported} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await uploader(
      input,
      fichier('2026-S38-menu-b.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20', 'B', 'Chili')),
      fichier('2026-S39-menu-c.md', mdSemaine('2026-S39', '2026-09-21', '2026-09-27', 'C', 'Basquaise')),
    );
    expect(Object.keys(loadWeeks()).sort()).toEqual(['2026-S38', '2026-S39']);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/2 semaine\(s\) importée\(s\)/);
  });

  it('un fichier invalide n\u2019empêche pas les autres (erreur nominative)', async () => {
    const { container } = render(<ImportButton onImported={() => {}} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await uploader(
      input,
      fichier('casse.md', 'pas de frontmatter'),
      fichier('ok.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20')),
    );
    expect(Object.keys(loadWeeks())).toEqual(['2026-S38']);
    expect(screen.getByRole('alert')).toHaveTextContent(/casse\.md/);
  });

  it('demande confirmation avant de remplacer une semaine existante', async () => {
    const confirmMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirmMock);
    const { data } = parseWeeklyFile(mdSemaine('2026-S38', '2026-09-14', '2026-09-20'));
    upsertWeek('ancien', data);
    const { container } = render(<ImportButton onImported={() => {}} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await uploader(
      input,
      fichier('2026-S38-menu-b.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20')),
    );
    expect(confirmMock).toHaveBeenCalledOnce();
    expect(loadWeeks()['2026-S38'].raw).toBe('ancien');
    confirmMock.mockReturnValue(true);
    await uploader(
      input,
      fichier('2026-S38-menu-b.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20')),
    );
    expect(loadWeeks()['2026-S38'].raw).not.toBe('ancien');
    vi.unstubAllGlobals();
  });
});

describe('Icon', () => {
  const NAMES = [
    'cart', 'target', 'chev', 'chev-left', 'chev-right', 'pot', 'scale', 'moon',
    'box', 'snow', 'fish', 'leaf', 'wheat', 'bowl', 'meat', 'check', 'clock',
    'flame', 'drop', 'play',
  ] as const;

  it('rend un svg 24×24 stroke currentColor à la taille demandée', () => {
    render(<Icon name="cart" size={15} />);
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', '15');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('accepte un strokeWidth custom (check géant)', () => {
    render(<Icon name="check" size={24} strokeWidth={2.5} />);
    expect(document.querySelector('svg')).toHaveAttribute('stroke-width', '2.5');
  });

  it('couvre les 20 noms du design system sans crash', () => {
    for (const name of NAMES) {
      const { unmount } = render(<Icon name={name} />);
      expect(document.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });
});
