import { describe, expect, it } from 'vitest';
import type { MenuDay, Recette } from '../src/lib/model';
import {
  compteChecklist,
  kcalDuJour,
  poidsActuel,
  recetteParRef,
  variationPoids7j,
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

describe('stats: variationPoids7j', () => {
  it('retourne le % vs la pesée la plus proche de J-7', () => {
    const weights = [w('2026-08-01', 80), w('2026-08-29', 80), w('2026-09-01', 78), w('2026-09-08', 77.4)];
    expect(variationPoids7j(weights)).toBeCloseTo(-0.769, 2);
  });

  it('retourne null avec une seule pesée', () => {
    expect(variationPoids7j([w('2026-09-08', 78)])).toBeNull();
  });

  it('retourne null si la pesée précédente a plus de 14 jours', () => {
    expect(variationPoids7j([w('2026-08-01', 80), w('2026-09-08', 78)])).toBeNull();
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

describe('stats: kcalDuJour', () => {
  const recettes: Recette[] = [
    { id: 'r1', nom: 'R1', kcal: 680 },
    { id: 'r2', nom: 'R2', kcal: 620 },
    { id: 'r7', nom: 'R7', kcal: 710 },
  ];

  it('somme les repas du profil Marc (déjeuner Marc + dîner famille)', () => {
    const jour: MenuDay = {
      jour: 'lundi',
      recetteRefs: { dejeunerMarc: 'r1', dinerFamille: 'r2', dejeunerMelanie: 'r7' },
    };
    expect(kcalDuJour(jour, recettes, 'marc')).toBe(1300);
  });

  it('Mélanie : diner-melanie remplace diner-famille quand présent', () => {
    const jour: MenuDay = {
      jour: 'lundi',
      dinerMelanie: 'Dinde + gratin (keto)',
      recetteRefs: { dinerFamille: 'r2', dinerMelanie: 'r7', dejeunerMelanie: 'r1' },
    };
    expect(kcalDuJour(jour, recettes, 'melanie')).toBe(1390);
  });

  it('Mélanie sans dîner attitré : repli sur le dîner famille', () => {
    const jour: MenuDay = {
      jour: 'lundi',
      recetteRefs: { dinerFamille: 'r2', dejeunerMelanie: 'r1' },
    };
    expect(kcalDuJour(jour, recettes, 'melanie')).toBe(1300);
  });

  it('Mélanie : son dîner sans ref ne compte PAS la recette famille', () => {
    const jour: MenuDay = {
      jour: 'lundi',
      dejeunerMelanie: 'Box thon-avocat',
      dinerMelanie: 'Bolo sur courgettes (sans ref)',
      recetteRefs: { dinerFamille: 'r2', dejeunerMelanie: 'r1' },
    };
    expect(kcalDuJour(jour, recettes, 'melanie')).toBe(680);
  });

  it('retourne null sans jour, sans refs ou sans kcal', () => {
    expect(kcalDuJour(undefined, recettes, 'marc')).toBeNull();
    expect(kcalDuJour({ jour: 'lundi' }, recettes, 'marc')).toBeNull();
    expect(kcalDuJour({ jour: 'lundi', recetteRefs: { dejeunerMarc: 'r1' } }, [
      { id: 'r1', nom: 'R1' },
    ], 'marc')).toBeNull();
  });
});

describe('stats: compteChecklist', () => {
  it('compte les items cochés', () => {
    const items = [{ id: 'a' }, { id: 'c' }, { id: 'b' }];
    expect(compteChecklist({ a: true, c: true }, items)).toEqual({ faites: 2, total: 3 });
    expect(compteChecklist({}, items)).toEqual({ faites: 0, total: 3 });
  });
});
