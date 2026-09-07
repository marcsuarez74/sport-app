import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { Onboarding } from '../src/components/onboarding/Onboarding';
import type { UserProfile } from '../src/lib/model';
import { getWeights, loadProfile } from '../src/lib/storage';
import { todayISO } from '../src/lib/dates';

const submitForm = async (user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) => {
  await user.type(screen.getByLabelText('Poids (kg)'), overrides.poids ?? '84.2');
  await user.type(screen.getByLabelText('Âge'), overrides.age ?? '41');
  await user.type(screen.getByLabelText('Taille (cm)'), overrides.taille ?? '178');
  await user.click(screen.getByRole('button', { name: /C'est parti/ }));
};

describe('Onboarding — étape 1 (choix du profil)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche la question et les deux cartes profil', () => {
    render(<Onboarding onDone={() => {}} />);

    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marc/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mélanie/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Poids (kg)')).not.toBeInTheDocument();
  });

  it('les points de progression marquent l\'étape 1', () => {
    render(<Onboarding onDone={() => {}} />);

    const dots = screen.getByRole('group', { name: /Progression/ });
    expect(dots.querySelectorAll('span')).toHaveLength(2);
    expect(dots.querySelectorAll('span')[0]).toHaveClass('onboarding-dot-active');
  });

  it('le choix du profil passe à l\'étape 2 avec le prénom et un retour', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Mélanie/ }));

    expect(screen.getByRole('heading', { name: /Salut Mélanie/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Poids (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('Âge')).toBeInTheDocument();
    expect(screen.getByLabelText('Taille (cm)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour/ })).toBeInTheDocument();
  });

  it('le retour ramène à l\'étape 1', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Marc/ }));

    await user.click(screen.getByRole('button', { name: /Retour/ }));

    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
  });
});

describe('Onboarding — étape 2 (validation et enregistrement)', () => {
  let onDone: Mock<(profile: UserProfile) => void>;

  beforeEach(() => {
    localStorage.clear();
    onDone = vi.fn();
  });

  const ouvrirEtape2 = async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: /Mélanie/ }));
    return user;
  };

  it('refuse un formulaire incomplet avec une erreur explicite', async () => {
    await ouvrirEtape2();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Poids (kg)'), '62.4');
    await user.click(screen.getByRole('button', { name: /C'est parti/ }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/remplis/i);
    expect(onDone).not.toHaveBeenCalled();
    expect(loadProfile()).toBeNull();
  });

  it('refuse des valeurs hors bornes (poids 500 kg)', async () => {
    const user = await ouvrirEtape2();

    await submitForm(user, { poids: '500' });

    expect(screen.getByRole('alert')).toHaveTextContent(/poids/i);
    expect(loadProfile()).toBeNull();
  });

  it('enregistre le profil + la première pesée datée du jour et appelle onDone', async () => {
    const user = await ouvrirEtape2();

    await submitForm(user, { poids: '62.4' });

    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: 'melanie', age: 41, taille: 178 }));
    expect(loadProfile()).toEqual({ id: 'melanie', age: 41, taille: 178 });
    expect(getWeights('melanie')).toEqual([{ date: todayISO(), kg: 62.4 }]);
  });

  it('accepte les bornes hautes valides (poids 250, âge 100, taille 230)', async () => {
    const user = await ouvrirEtape2();

    await submitForm(user, { poids: '250', age: '100', taille: '230' });

    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: 'melanie', age: 100, taille: 230 }));
  });
});
