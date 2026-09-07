import { imagePourRayon } from '../../src/lib/rayons';
import defaut from '../../src/assets/rayons/defaut.jpg';
import legumes from '../../src/assets/rayons/legumes.jpg';

describe('imagePourRayon', () => {
  it("retourne l'image du rayon connu", () => {
    expect(imagePourRayon('legumes')).toBe(legumes);
    expect(imagePourRayon('proteines')).not.toBe(defaut);
    expect(imagePourRayon('laitiers')).toBeTruthy();
    expect(imagePourRayon('feculents')).toBeTruthy();
    expect(imagePourRayon('fruits')).toBeTruthy();
    expect(imagePourRayon('divers')).toBeTruthy();
  });

  it('est insensible à la casse et aux accents', () => {
    expect(imagePourRayon('LÉGUMES')).toBe(legumes);
    expect(imagePourRayon('Proteines')).toBe(imagePourRayon('PROTEINES'));
    expect(imagePourRayon('  Feculents ')).toBe(imagePourRayon('feculents'));
  });

  it('retourne le fallback pour un rayon inconnu', () => {
    expect(imagePourRayon('surgelés')).toBe(defaut);
    expect(imagePourRayon('')).toBe(defaut);
  });
});
