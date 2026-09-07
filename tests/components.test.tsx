import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChecklistItem, CourseItem } from '../src/lib/model';
import { getChecks, setCheck } from '../src/lib/storage';
import { Checklist } from '../src/components/Checklist';
import { Sparkline } from '../src/components/Sparkline';
import { ShoppingList } from '../src/components/cuisine/ShoppingList';

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
    expect(container.querySelector('polyline')!.getAttribute('stroke')).toBe('#4f6bed');
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

  it('capitalizes the rayon slug', () => {
    render(
      <ShoppingList
        items={[{ id: 'courses:epicerie:sel', rayon: 'epicerie', label: 'Sel' }]}
        semaine="S39"
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Epicerie' })).toBeInTheDocument();
  });
});
