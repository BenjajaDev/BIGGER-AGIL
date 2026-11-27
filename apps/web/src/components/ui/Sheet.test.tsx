import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('opens as a modal named by its title and shows its content and footer', () => {
    render(
      <Sheet open onClose={vi.fn()} title="Palta" footer={<button type="button">Guardar</button>}>
        <p>Contenido</p>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Palta' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('Contenido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('stays closed until opened', () => {
    render(
      <Sheet open={false} onClose={vi.fn()} title="Palta">
        <p>Contenido</p>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks to close on Esc, on the close button and on the backdrop', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Palta">
        <p>Contenido</p>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Palta' });
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
