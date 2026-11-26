import { render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders value and trend, and links when `to` is given', () => {
    render(
      <MemoryRouter>
        <StatCard
          label="Ventas"
          value="$10.000"
          icon={Wallet}
          trend={{ direction: 'up', text: '+5 %' }}
          to="/reportes"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('+5 %')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ventas/ })).toHaveAttribute('href', '/reportes');
  });
});
