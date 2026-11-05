import { formatTestTicket } from '@bigger/shared';
import { render, screen } from '@testing-library/react';
import { TicketPreview } from './TicketPreview';

describe('TicketPreview', () => {
  it('draws the lines in a paper as wide as the printer columns', () => {
    const lines = formatTestTicket({ columns: 32 });
    render(<TicketPreview lines={lines} columns={32} label="Vista previa" />);

    const figure = screen.getByRole('figure', { name: 'Vista previa' });
    expect(figure.firstElementChild).toHaveStyle({ width: '32ch' });
    expect(screen.getByText('HOJA DE PRUEBA')).toBeInTheDocument();
    expect(screen.getByText(/áéíóú/)).toBeInTheDocument();
  });

  it('keeps blank lines as space so the paper length matches', () => {
    render(
      <TicketPreview
        lines={[{ text: '', align: 'left', size: 'normal', bold: false }]}
        columns={32}
        label="Vista previa"
      />,
    );
    expect(screen.getByRole('figure').textContent).toBe(' ');
  });
});
