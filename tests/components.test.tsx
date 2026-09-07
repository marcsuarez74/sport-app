import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChecklistItem } from '../src/lib/model';
import { getChecks, setCheck } from '../src/lib/storage';
import { Checklist } from '../src/components/Checklist';
import { Sparkline } from '../src/components/Sparkline';

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
