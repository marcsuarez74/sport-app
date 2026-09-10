import { describe, expect, it } from 'vitest';
import { formatEuro, parseEuro } from '../../src/lib/prix';

describe('formatEuro', () => {
  it('formate en fr-FR avec 2 décimales et le symbole €', () => {
    expect(formatEuro(38.2)).toMatch(/^38,20\s*€$/);
    expect(formatEuro(40)).toMatch(/^40,00\s*€$/);
    expect(formatEuro(1234.5)).toMatch(/^1\s*234,50\s*€$/);
  });
});

describe('parseEuro', () => {
  it('accepte la virgule, le point et les espaces', () => {
    expect(parseEuro('38,20')).toBe(38.2);
    expect(parseEuro('38.2')).toBe(38.2);
    expect(parseEuro(' 41,30 ')).toBe(41.3);
  });

  it('arrondit à 2 décimales', () => {
    expect(parseEuro('10,333')).toBe(10.33);
  });

  it('renvoie null si invalide ou ≤ 0', () => {
    expect(parseEuro('abc')).toBeNull();
    expect(parseEuro('')).toBeNull();
    expect(parseEuro('0')).toBeNull();
    expect(parseEuro('-5')).toBeNull();
  });
});
