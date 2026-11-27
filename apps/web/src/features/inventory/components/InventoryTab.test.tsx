import type { Supply } from '@bigger/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { localToday } from '../../../lib/dates';
import { addDaysIso } from '../movement-math';
import { InventoryTab } from './InventoryTab';

const make = (name: string, patch: Partial<Supply>): Supply => ({
  id: `00000000-0000-4000-8000-${String(name.length).padStart(12, '0')}`,
  name,
  unit: 'kg',
  minStock: 3,
  costPerUnitClp: 100,
  supplierId: null,
  supplierName: null,
  expiresOn: null,
  stock: 10,
  ...patch,
});

describe('InventoryTab', () => {
  const supplies = [
    make('Tomate', {}),
    make('Palta', { stock: 4, expiresOn: addDaysIso(localToday(), 1) }),
    make('Pan', { stock: 1 }),
  ];

  it('lists urgent supplies first as one tappable row with a full name', async () => {
    const onOpen = vi.fn();
    render(<InventoryTab supplies={supplies} onOpen={onOpen} onCreate={vi.fn()} />);
    const rows = within(screen.getByRole('list', { name: 'Insumos' })).getAllByRole('button');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      'Palta, 4 kg, vence mañana',
      'Pan, 1 kg, faltan 2 kg para el mínimo',
      'Tomate, 10 kg, en orden',
    ]);
    await userEvent.click(rows[0] as HTMLElement);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ name: 'Palta' }));
  });

  it('filters with counts and searches by name', async () => {
    render(<InventoryTab supplies={supplies} onOpen={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Por reponer\s*1$/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Por vencer/ }));
    expect(screen.getAllByRole('button', { name: /,/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /^Todos/ }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar insumo' }), 'toma');
    expect(screen.getAllByRole('button', { name: /,/ })).toHaveLength(1);
  });
});
