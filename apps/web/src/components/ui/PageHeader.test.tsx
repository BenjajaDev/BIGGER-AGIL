import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('sets the document title and renders the back link', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Mesas" back={{ to: '/inicio', label: 'Volver' }} />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Mesas · BIGGER');
    expect(screen.getByRole('heading', { level: 1, name: 'Mesas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/inicio');
  });
});
