import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuDay, Recette } from '../src/lib/model';
import {
  compteChecklist,
  poidsActuel,
  recetteParRef,
  trouverJourDuJour,
  variationKg7j,
} from '../src/lib/stats';
import type { WeightEntry } from '../src/lib/storage';

const w = (date: string, kg: number): WeightEntry => ({ date, kg });

describe('stats: poidsActuel', () => {
  it('retourne la dernière pesée', () => {
    expect(poidsActuel([w('2026-08-01', 85), w('2026-09-01', 78)])).toEqual(w('2026-09-01', 78));
  });

  it('retourne null sans pesée', () => {
    expect(poidsActuel([])).toBeNull();
  });
});

describe('stats: variationKg7j', () => {
  it('retourne l écart en kg vs la pesée la plus proche de J-7', () => {
    const weights = [w('2026-08-01', 80), w('2026-08-29', 80), w('2026-09-01', 78), w('2026-09-08', 77.4)];
    expect(variationKg7j(weights)).toBeCloseTo(-0.6, 2);
  });

  it('retourne null avec une seule pesée', () => {
    expect(variationKg7j([w('2026-09-08', 78)])).toBeNull();
  });

  it('retourne null si la pesée précédente a plus de 14 jours', () => {
    expect(variationKg7j([w('2026-08-01', 80), w('2026-09-08', 78)])).toBeNull();
  });
});

describe('stats: recetteParRef', () => {
  const recettes: Recette[] = [
    { id: 'r1-poulet', nom: 'Poulet' },
    { id: 'r10-else', nom: 'Else' },
  ];

  it('match exact puis préfixe borné (r1 ne matche pas r10)', () => {
    expect(recetteParRef('r1', recettes)?.id).toBe('r1-poulet');
    expect(recetteParRef('R1-POULET', recettes)?.id).toBe('r1-poulet');
    expect(recetteParRef('inconnu', recettes)).toBeUndefined();
  });
});

describe('stats: compteChecklist', () => {
  it('compte les items cochés', () => {
    const items = [{ id: 'a' }, { id: 'c' }, { id: 'b' }];
    expect(compteChecklist({ a: true, c: true }, items)).toEqual({ faites: 2, total: 3 });
    expect(compteChecklist({}, items)).toEqual({ faites: 0, total: 3 });
  });
});

describe('stats: trouverJourDuJour', () => {
  const menu: MenuDay[] = [
    { jour: 'Lundi', dejeunerMarc: 'A' },
    { jour: '  Mercredi ', dinerFamille: 'B' },
    { jour: 'Vendredi', dejeunerMarc: 'C' },
  ];

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retourne le jour du menu correspondant à aujourd’hui (trim + casse ignorés)', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00')); // mercredi
    expect(trouverJourDuJour(menu)).toEqual({ jour: '  Mercredi ', dinerFamille: 'B' });
  });

  it('retourne undefined si le jour courant est absent du menu', () => {
    vi.setSystemTime(new Date('2026-09-13T10:00:00')); // dimanche
    expect(trouverJourDuJour(menu)).toBeUndefined();
  });
});
