import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import App from '../src/App';
import { ProfilScreen } from '../src/components/ProfilScreen';
import type { UserProfile } from '../src/lib/model';
import { addWeight, getWeights, loadProfile, saveProfile, saveWeek } from '../src/lib/storage';
import { parseWeeklyFile } from '../src/lib/parse';

const fixture = () => `---
semaine: 2026-S37
menu: A
du: 2026-09-07
au: 2026-09-13
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

const profileMarc: UserProfile = {
  id: 'marc',
  dateNaissance: '1985-04-12',
  taille: 178,
  objectif: { type: 'perte', echeance: '2026-12-15' },
  complements: [],
  regime: 'aucun',
};

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
  let onProfileSaved: Mock<(p: UserProfile) => void>;
  let onImported: Mock<() => void>;

  beforeEach(() => {
    localStorage.clear();
    onBack = vi.fn();
    onChangeProfile = vi.fn();
    onProfileSaved = vi.fn();
    onImported = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche le titre, le retour, mes infos et le changement de profil', () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );

    expect(screen.getByRole('heading', { name: 'Profil', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Date de naissance')).toHaveValue('1985-04-12');
    expect(screen.getByLabelText('Taille (cm)')).toHaveValue(178);
    expect(screen.getByRole('button', { name: 'Enregistrer mes infos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Changer de profil/ })).toBeInTheDocument();
    // Section « Semaine » : l'import du cycle est de retour dans le profil (rotation)
    expect(screen.getByRole('heading', { name: 'Semaine', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Importer un cycle (.md)')).toBeInTheDocument();
  });

  it('enregistre les infos modifiées dans le store', () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );

    // input[type=date] ne se laisse pas taper : convention repo = fireEvent.change.
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1984-04-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes infos' }));

    expect(loadProfile()).toEqual({
      id: 'marc',
      dateNaissance: '1984-04-12',
      taille: 178,
      objectif: { type: 'perte', echeance: '2026-12-15' },
      complements: [],
      regime: 'aucun',
    });
  });

  it('refuse une date de naissance donnant un âge hors bornes (cohérent avec l’onboarding)', () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );

    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes infos' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/âge/i);
    expect(loadProfile()).toBeNull();
  });

  it('prévient le parent après enregistrement (état App resynchronisé)', () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );

    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1984-04-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes infos' }));

    expect(onProfileSaved).toHaveBeenCalledWith({
      id: 'marc',
      dateNaissance: '1984-04-12',
      taille: 178,
      objectif: { type: 'perte', echeance: '2026-12-15' },
      complements: [],
      regime: 'aucun',
    });
  });

  it('change de profil après confirmation (et seulement après)', async () => {
    const spy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', spy);
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
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

  it('affiche les objectifs existants et enregistre leurs modifications', async () => {
    render(
      <ProfilScreen
        profile={{ ...profileMarc, poidsObjectif: 72 }}
        onBack={onBack}
        onChangeProfile={onChangeProfile}
        onProfileSaved={onProfileSaved}
        onImported={onImported}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText('Poids objectif (kg)')).toHaveValue(72);
    expect(screen.queryByLabelText('Objectif kcal/jour')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Poids objectif (kg)'));
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '70');
    await user.click(screen.getByRole('button', { name: "Enregistrer l'objectif" }));

    const attendu = { ...profileMarc, poidsObjectif: 70 };
    expect(loadProfile()).toEqual(attendu);
    expect(onProfileSaved).toHaveBeenCalledWith(attendu);
  });

  it('permet de supprimer le poids objectif en vidant le champ', async () => {
    render(
      <ProfilScreen
        profile={{ ...profileMarc, poidsObjectif: 72 }}
        onBack={onBack}
        onChangeProfile={onChangeProfile}
        onProfileSaved={onProfileSaved}
        onImported={onImported}
      />,
    );
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Poids objectif (kg)'));
    await user.click(screen.getByRole('button', { name: "Enregistrer l'objectif" }));

    expect(loadProfile()).toEqual(profileMarc);
  });

  it('affiche la version de l’app en pied d’écran', () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );

    expect(
      screen.getByText(`Rituel v${__APP_VERSION__} — vos données restent sur votre téléphone.`),
    ).toBeInTheDocument();
  });

  it('date de naissance vidée : le hint propose de saisir (pas d’âge fantôme « 2026 ans »)', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );

    expect(screen.getByText('41 ans — calculé automatiquement.')).toBeInTheDocument();
    // input[type=date] ne se laisse pas taper : convention repo = fireEvent.change.
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '' } });

    expect(screen.queryByText(/2026 ans/)).not.toBeInTheDocument();
    expect(screen.getByText(/Sélectionne ta date de naissance/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('refuse un poids objectif hors bornes avec une erreur explicite', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Poids objectif (kg)'), '500');
    await user.click(screen.getByRole('button', { name: "Enregistrer l'objectif" }));

    expect(screen.getByRole('alert')).toHaveTextContent(/poids objectif/i);
    expect(loadProfile()).toBeNull();
  });

  it('sections dédiées : objectif affiché et modifiable', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Objectif', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Perte de poids' })).toBeChecked();
    expect(screen.getByLabelText('Échéance (optionnelle)')).toHaveValue('2026-12-15');

    await user.click(screen.getByRole('radio', { name: 'Maintien' }));
    fireEvent.change(screen.getByLabelText('Échéance (optionnelle)'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: "Enregistrer l'objectif" }));

    expect(loadProfile()).toMatchObject({ objectif: { type: 'maintien' } });
    expect(onProfileSaved).toHaveBeenCalled();
  });

  it('sections dédiées : compléments ajoutés et retirés, persistés', async () => {
    render(
      <ProfilScreen profile={{ ...profileMarc, complements: ['Whey'] }} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: /Whey/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ajouter un complément'), 'Zinc');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les compléments' }));

    expect(loadProfile()).toMatchObject({ complements: ['Whey', 'Zinc'] });

    await user.click(screen.getByRole('button', { name: /Retirer Whey/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les compléments' }));
    expect(loadProfile()).toMatchObject({ complements: ['Zinc'] });
  });

  it('sections dédiées : régime persisté', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'Végétarien' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le régime' }));

    expect(loadProfile()).toMatchObject({ regime: 'vegetarien' });
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
    expect(screen.queryByRole('button', { name: 'Cuisine' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByRole('button', { name: 'Cuisine' })).toBeInTheDocument();
  });

  it('la réouverture de l’écran montre les infos enregistrées (pas d’état périmé)', async () => {
    const user = monterApp();

    await user.click(screen.getByRole('button', { name: 'Mon profil' }));
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1984-04-12' } });
    await user.click(screen.getByRole('button', { name: 'Enregistrer mes infos' }));

    await user.click(screen.getByRole('button', { name: /Retour/ }));
    await user.click(screen.getByRole('button', { name: 'Mon profil' }));

    expect(screen.getByLabelText('Date de naissance')).toHaveValue('1984-04-12');
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
  });
});
