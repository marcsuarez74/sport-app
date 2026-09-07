import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import App from '../src/App';
import { ProfilScreen } from '../src/components/ProfilScreen';
import type { UserProfile } from '../src/lib/model';
import { addWeight, getWeights, loadProfile, saveProfile, saveWeek } from '../src/lib/storage';
import { parseWeeklyFile } from '../src/lib/parse';

const fixture = () => `---
semaine: 2026-S39
menu: A
du: 2026-09-21
au: 2026-09-27
---

## courses

### Legumes
- [ ] Carottes

## menu

### Lundi
- diner-famille: Poulet rôti

## batch

- [ ] Riz (4 parts)

## marc

### Cibles
- 78 kg

### Seances
- [ ] Full body

### Rappels
- Protéines

## melanie

### Cibles
- Keto strict

### Seances
- [ ] Cardio

### Rappels
- Électrolytes
`;

const profileMarc: UserProfile = { id: 'marc', age: 41, taille: 178 };

const monterApp = () => {
  saveWeek(fixture(), parseWeeklyFile(fixture()).data);
  saveProfile(profileMarc);
  const user = userEvent.setup();
  render(<App />);
  return user;
};

describe('ProfilScreen (unité)', () => {
  let onBack: Mock<() => void>;
  let onChangeProfile: Mock<() => void>;
  let onImported: Mock<() => void>;
  let onProfileSaved: Mock<(p: UserProfile) => void>;

  beforeEach(() => {
    localStorage.clear();
    onBack = vi.fn();
    onChangeProfile = vi.fn();
    onImported = vi.fn();
    onProfileSaved = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche le titre, le retour, mes infos, l’import et le changement de profil', () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onImported={onImported} onProfileSaved={onProfileSaved} />,
    );

    expect(screen.getByRole('heading', { name: 'Profil', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Âge')).toHaveValue(41);
    expect(screen.getByLabelText('Taille (cm)')).toHaveValue(178);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
    expect(screen.getByText('Importer un autre .md')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Changer de profil/ })).toBeInTheDocument();
  });

  it('enregistre les infos modifiées dans le store', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onImported={onImported} onProfileSaved={onProfileSaved} />,
    );
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Âge'));
    await user.type(screen.getByLabelText('Âge'), '42');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(loadProfile()).toEqual({ id: 'marc', age: 42, taille: 178 });
  });

  it('refuse les valeurs hors bornes avec une erreur explicite (cohérent avec l’onboarding)', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onImported={onImported} onProfileSaved={onProfileSaved} />,
    );
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Âge'));
    await user.type(screen.getByLabelText('Âge'), '999');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/âge/i);
    expect(loadProfile()).toBeNull();
  });

  it('prévient le parent après enregistrement (état App resynchronisé)', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onImported={onImported} onProfileSaved={onProfileSaved} />,
    );
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Âge'));
    await user.type(screen.getByLabelText('Âge'), '42');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onProfileSaved).toHaveBeenCalledWith({ id: 'marc', age: 42, taille: 178 });
  });

  it('change de profil après confirmation (et seulement après)', async () => {
    const spy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', spy);
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onImported={onImported} onProfileSaved={onProfileSaved} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Changer de profil/ }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onChangeProfile).toHaveBeenCalledTimes(1);

    spy.mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: /Changer de profil/ }));
    expect(onChangeProfile).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

describe('ProfilScreen (intégration via App)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('l’icône profil de la bannière ouvre l’écran, le retour revient au shell', async () => {
    const user = monterApp();

    await user.click(screen.getByRole('button', { name: 'Mon profil' }));
    expect(screen.getByRole('heading', { name: 'Profil', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '🛒 Cuisine' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByRole('button', { name: '🛒 Cuisine' })).toBeInTheDocument();
  });

  it('la réouverture de l’écran montre les infos enregistrées (pas d’état périmé)', async () => {
    const user = monterApp();

    await user.click(screen.getByRole('button', { name: 'Mon profil' }));
    await user.clear(screen.getByLabelText('Âge'));
    await user.type(screen.getByLabelText('Âge'), '42');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await user.click(screen.getByRole('button', { name: /Retour/ }));
    await user.click(screen.getByRole('button', { name: 'Mon profil' }));

    expect(screen.getByLabelText('Âge')).toHaveValue(42);
  });

  it('changer de profil efface le choix (onboarding) mais garde les données', async () => {
    addWeight('marc', '2026-09-22', 84.2);
    const spy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', spy);
    const user = monterApp();

    await user.click(screen.getByRole('button', { name: 'Mon profil' }));
    await user.click(screen.getByRole('button', { name: /Changer de profil/ }));

    expect(loadProfile()).toBeNull();
    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
    expect(getWeights('marc')).toEqual([{ date: '2026-09-22', kg: 84.2 }]);
    expect(document.documentElement.getAttribute('data-profile')).toBeNull();
  });
});
