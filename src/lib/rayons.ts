import feculents from '../assets/rayons/feculents.jpg';
import defaut from '../assets/rayons/defaut.jpg';
import divers from '../assets/rayons/divers.jpg';
import fruits from '../assets/rayons/fruits.jpg';
import laitiers from '../assets/rayons/laitiers.jpg';
import legumes from '../assets/rayons/legumes.jpg';
import proteines from '../assets/rayons/proteines.jpg';

const RAYONS: Record<string, string> = {
  proteines,
  laitiers,
  feculents,
  legumes,
  fruits,
  divers,
};

// 'Légumes' → 'legumes' : insensible à la casse, aux accents et aux espaces.
const normaliser = (rayon: string): string =>
  rayon
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const imagePourRayon = (rayon: string): string => RAYONS[normaliser(rayon)] ?? defaut;
