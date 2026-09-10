import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { Onboarding } from '../src/components/onboarding/Onboarding';
import type { ProfilLegacy, UserProfile } from '../src/lib/model';
import { addWeight, getWeights, loadProfile } from '../src/lib/storage';
import { todayISO } from '../src/lib/dates';

// happy-dom ne déclenche pas la soumission implicite des formulaires :
// convention repo = fireEvent.submit.
const soumettre = () => fireEvent.submit(document.querySelector('.onboarding-form')!);

// Les input[type=date] ne se laissent pas taper : convention repo = fireEvent.change.
const saisirDate = (label: string, valeur: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value: valeur } });
};

const remplirEtape2 = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: { poids?: string; dateNaissance?: string; taille?: string } = {},
) => {
  await user.clear(screen.getByLabelText('Poids (kg)'));
  await user.type(screen.getByLabelText('Poids (kg)'), overrides.poids ?? '62.4');
  saisirDate('Date de naissance', overrides.dateNaissance ?? '1987-03-02');
  await user.clear(screen.getByLabelText('Taille (cm)'));
  await user.type(screen.getByLabelText('Taille (cm)'), overrides.taille ?? '165');
};

const allerEtape2 = async () => {
  const user = userEvent.setup();
  render(<Onboarding onDone={onDone} />);
  await user.click(screen.getByRole('button', { name: /Mélanie/ }));
  return user;
};

const allerEtape3 = async () => {
  const user = await allerEtape2();
  await remplirEtape2(user);
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  return user;
};

const allerEtape4 = async () => {
  const user = await allerEtape3();
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  return user;
};

let onDone: Mock<(profile: UserProfile) => void>;

beforeEach(() => {
  localStorage.clear();
  onDone = vi.fn();
});

describe('Onboarding — étape 1 (choix du profil)', () => {
  it('affiche la question, les deux cartes et 4 points de progression', () => {
    render(<Onboarding onDone={() => {}} />);

    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marc/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mélanie/ })).toBeInTheDocument();
    const dots = screen.getByRole('group', { name: /Progression/ });
    expect(dots.querySelectorAll('span')).toHaveLength(4);
    expect(dots.querySelectorAll('span')[0]).toHaveClass('onboarding-dot-active');
    expect(screen.queryByLabelText('Poids (kg)')).not.toBeInTheDocument();
  });

  it('le choix du profil passe à l étape 2 et le retour ramène à l étape 1', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Mélanie/ }));
    expect(screen.getByRole('heading', { name: /Salut Mélanie/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Date de naissance')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
  });
});

describe('Onboarding — étape 2 (infos : poids, date de naissance, taille)', () => {
  it('refuse un formulaire incomplet avec une erreur explicite', async () => {
    await allerEtape2();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Poids (kg)'), '62.4');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/incomplet/i);
    expect(loadProfile()).toBeNull();
  });

  it('refuse un poids hors bornes', async () => {
    const user = await allerEtape2();
    await remplirEtape2(user, { poids: '500' });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/poids/i);
  });

  it('refuse une date de naissance dans le futur', async () => {
    const user = await allerEtape2();
    await remplirEtape2(user, { dateNaissance: '2999-01-01' });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/futur/i);
  });

  it('refuse un âge calculé hors bornes (naissance en 2020)', async () => {
    const user = await allerEtape2();
    await remplirEtape2(user, { dateNaissance: '2020-01-01' });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/10 et 100 ans/i);
  });

  it('passe à l étape 3 (objectif) quand les infos sont valides', async () => {
    await allerEtape3();

    expect(screen.getByRole('heading', { name: /Ton objectif/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Perte de poids/ })).toBeChecked();
  });
});

describe('Onboarding — étape 3 (objectif)', () => {
  it('permet de choisir un des 4 types et affiche sa description', async () => {
    const user = await allerEtape3();

    await user.click(screen.getByRole('radio', { name: /Prise de masse/ }));
    expect(screen.getByRole('radio', { name: /Prise de masse/ })).toBeChecked();
    expect(screen.getByText(/Prendre du muscle/)).toBeInTheDocument();
  });

  it('valide le poids objectif (refus hors bornes)', async () => {
    const user = await allerEtape3();
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '500');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/poids objectif/i);
  });

  it('le retour conserve les infos saisies', async () => {
    const user = await allerEtape3();
    await user.click(screen.getByRole('button', { name: /Retour/ }));

    expect(screen.getByLabelText('Poids (kg)')).toHaveValue(62.4);
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByRole('heading', { name: /Ton objectif/ })).toBeInTheDocument();
  });
});

describe('Onboarding — étape 4 (compléments et régime)', () => {
  it('bascule les compléments presets', async () => {
    const user = await allerEtape4();
    const whey = screen.getByRole('button', { name: 'Whey' });
    expect(whey).not.toHaveAttribute('aria-pressed', 'true');
    await user.click(whey);
    expect(whey).toHaveAttribute('aria-pressed', 'true');
    await user.click(whey);
    expect(whey).not.toHaveAttribute('aria-pressed', 'true');
  });

  it('ajoute un complément libre et refuse le doublon (casse ignorée)', async () => {
    const user = await allerEtape4();
    await user.click(screen.getByRole('button', { name: 'Whey' }));
    await user.type(screen.getByLabelText('Ajouter un complément'), 'whey');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/déjà sélectionné/i);
    await user.clear(screen.getByLabelText('Ajouter un complément'));
    await user.type(screen.getByLabelText('Ajouter un complément'), 'Zinc');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    expect(screen.getByRole('button', { name: /Zinc/ })).toBeInTheDocument();
  });

  it('choisit un régime et enregistre le profil v2 complet (C est parti)', async () => {
    const user = await allerEtape4();
    await user.click(screen.getByRole('button', { name: 'Créatine' }));
    await user.click(screen.getByRole('radio', { name: 'Keto' }));
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '58');
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'melanie',
        dateNaissance: '1987-03-02',
        taille: 165,
        poidsObjectif: 58,
        objectif: { type: 'perte' },
        complements: ['Créatine'],
        regime: 'keto',
      } satisfies UserProfile),
    );
    expect(loadProfile()).toEqual({
      id: 'melanie',
      dateNaissance: '1987-03-02',
      taille: 165,
      poidsObjectif: 58,
      objectif: { type: 'perte' },
      complements: ['Créatine'],
      regime: 'keto',
    });
    expect(getWeights('melanie')).toEqual([{ date: todayISO(), kg: 62.4 }]);
  });

  it('enregistre sans aucun champ optionnel (maintien, aucun complément)', async () => {
    const user = await allerEtape4();
    await user.click(screen.getByRole('radio', { name: 'Maintien' }));
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'melanie',
        dateNaissance: '1987-03-02',
        taille: 165,
        objectif: { type: 'maintien' },
        complements: [],
        regime: 'aucun',
      } satisfies UserProfile),
    );
  });
});

describe('Onboarding — migration (prefill ancienne forme)', () => {
  const legacy: ProfilLegacy = { id: 'marc', age: 41, taille: 178, poidsObjectif: 74 };

  it('démarre à l étape 2 avec le bandeau, sans points ni étape 1', () => {
    render(<Onboarding onDone={() => {}} prefill={legacy} />);

    expect(screen.getByText(/Une mise à jour/)).toBeInTheDocument();
    expect(screen.getByText(/non modifiable ici/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mélanie/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Progression/ })).not.toBeInTheDocument();
  });

  it('préremplit poids (dernière pesée), taille et poids objectif ; date vide', () => {
    addWeight('marc', '2026-09-01', 79.1);
    addWeight('marc', '2026-09-09', 78.4);
    render(<Onboarding onDone={() => {}} prefill={legacy} />);

    expect(screen.getByLabelText('Poids (kg)')).toHaveValue(78.4);
    expect(screen.getByLabelText('Taille (cm)')).toHaveValue(178);
    expect(screen.getByLabelText('Poids objectif (kg)')).toHaveValue(74);
    expect(screen.getByLabelText('Date de naissance')).toHaveValue('');
  });

  it('la date de naissance reste obligatoire avant de continuer', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} prefill={legacy} />);
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/incomplet/i);
  });

  it('enregistre le profil v2 (migration à sens unique) et appelle onDone', async () => {
    addWeight('marc', '2026-09-09', 78.4);
    const user = userEvent.setup();
    render(<Onboarding onDone={onDone} prefill={legacy} />);
    saisirDate('Date de naissance', '1985-04-12');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'marc',
        dateNaissance: '1985-04-12',
        taille: 178,
        poidsObjectif: 74,
        objectif: { type: 'perte' },
        complements: [],
        regime: 'aucun',
      } satisfies UserProfile),
    );
  });
});
