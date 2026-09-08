import { describe, expect, it } from 'vitest';
import { capitalize } from '../../src/lib/text';

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
