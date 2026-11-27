import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Tabs, tabPanelProps, type TabItem } from './Tabs';

type Id = 'a' | 'b' | 'c';
const items: readonly TabItem<Id>[] = [
  { value: 'a', label: 'Uno' },
  { value: 'b', label: 'Dos', count: 3, countTone: 'warning' },
  { value: 'c', label: 'Tres' },
];

function Harness() {
  const [value, setValue] = useState<Id>('a');
  return (
    <>
      <Tabs label="Secciones" items={items} value={value} onChange={setValue} idBase="t" />
      <div {...tabPanelProps('t', value)}>Panel {value}</div>
    </>
  );
}

describe('Tabs', () => {
  it('uses roving tabindex and selects with the keyboard, wrapping around', async () => {
    render(<Harness />);
    const first = screen.getByRole('tab', { name: 'Uno' });
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Dos/ })).toHaveAttribute('tabindex', '-1');

    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Dos/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Dos/ })).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Tres' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(first).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Tres' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Tres');
  });
});
