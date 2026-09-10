import { describe, expect, it } from 'vitest';
import { capitalize, fmtKg } from '../../src/lib/text';

describe('capitalize', () => {
  it('met la première lettre en majuscule', () => {
    expect(capitalize('lundi')).toBe('Lundi');
    expect(capitalize('mardi matin')).toBe('Mardi matin');
  });
  it('gère les cas limites', () => {
    expect(capitalize('')).toBe('');
    expect(capitalize('X')).toBe('X');
    expect(capitalize('épinards')).toBe('Épinards');
  });
});

describe('fmtKg', () => {
  it('formate un poids à la française (virgule, 1 décimale)', () => {
    expect(fmtKg(82.8)).toBe('82,8');
    expect(fmtKg(74)).toBe('74,0');
    expect(fmtKg(-0.3)).toBe('-0,3');
  });
});
