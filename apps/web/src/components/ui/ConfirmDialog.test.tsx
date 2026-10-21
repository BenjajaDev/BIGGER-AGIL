import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

function renderDialog(overrides: Partial<ConfirmDialogProps> = {}) {
  const props: ConfirmDialogProps = {
    open: true,
    title: '¿Eliminar Brownie?',
    description: 'Dejará de aparecer en la carta.',
    confirmLabel: 'Eliminar',
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ConfirmDialog {...props} />) };
}

describe('ConfirmDialog', () => {
  it('opens as a labelled modal with focus on the safe option', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar Brownie?' });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('Dejará de aparecer en la carta.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('confirms and cancels', async () => {
    const { props } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
  });

  it('shows the server reason when the action is refused', () => {
    renderDialog({ error: 'Es parte del combo «Once BIGGER».' });
    expect(screen.getByRole('alert')).toHaveTextContent('Es parte del combo «Once BIGGER».');
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderDialog();
    await expectNoA11yViolations(container);
  });
});
