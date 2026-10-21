import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { IN_DEVELOPMENT_MODULES } from '../../app/navigation';
import { expectNoA11yViolations } from '../../test/a11y';
import { UnderDevelopmentPage } from './UnderDevelopmentPage';

describe('UnderDevelopmentPage', () => {
  it.each(IN_DEVELOPMENT_MODULES.map((module) => [module.label, module] as const))(
    'renders a friendly notice for %s',
    (_label, module) => {
      render(
        <MemoryRouter>
          <UnderDevelopmentPage module={module} />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole('heading', { level: 1, name: `${module.label} está en desarrollo` }),
      ).toBeInTheDocument();
      expect(screen.getByText('En desarrollo')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver a Mesas' })).toHaveAttribute(
        'href',
        '/mesas',
      );
    },
  );

  it('never uses the red primary action', () => {
    const module = IN_DEVELOPMENT_MODULES[0];
    if (!module) throw new Error('Se esperaba al menos un módulo en desarrollo');
    const { container } = render(
      <MemoryRouter>
        <UnderDevelopmentPage module={module} />
      </MemoryRouter>,
    );
    expect(container.querySelector('.primary')).toBeNull();
  });

  it('has no detectable accessibility violations', async () => {
    const module = IN_DEVELOPMENT_MODULES[0];
    if (!module) throw new Error('Se esperaba al menos un módulo en desarrollo');
    const { container } = render(
      <MemoryRouter>
        <UnderDevelopmentPage module={module} />
      </MemoryRouter>,
    );
    await expectNoA11yViolations(container);
  });
});
