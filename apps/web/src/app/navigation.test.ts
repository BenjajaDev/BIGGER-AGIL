import { APP_MODULES, groupOf, IN_DEVELOPMENT_MODULES, modulesIn } from './navigation';

describe('navigation', () => {
  it('splits the modules into the two areas and keeps Resumen first', () => {
    expect(modulesIn('operation').map((module) => module.label)).toEqual([
      'Resumen',
      'Mesas',
      'Pedido',
      'Cocina',
    ]);
    expect(modulesIn('management').map((module) => module.path)).toEqual([
      '/configuracion',
      '/bodega',
      '/compras',
      '/reportes',
      '/clientes',
    ]);
  });

  it('knows which area a route belongs to, nested routes and the home included', () => {
    expect(groupOf('/')).toBe('operation');
    expect(groupOf('/mesas/abc')).toBe('operation');
    expect(groupOf('/configuracion/impresora')).toBe('management');
    expect(groupOf('/reportes')).toBe('management');
    expect(groupOf('/ruta-que-no-existe')).toBe('operation');
  });

  it('has unique paths and routes only the unfinished modules as «en desarrollo»', () => {
    const paths = APP_MODULES.map((module) => module.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(IN_DEVELOPMENT_MODULES.map((module) => module.path)).toEqual([
      '/bodega',
      '/compras',
      '/reportes',
      '/clientes',
    ]);
  });

  it('describes the live counters in plain Spanish', () => {
    const badge = APP_MODULES.find((module) => module.path === '/mesas')?.badge;
    expect(badge?.describe(1)).toBe('1 mesa por cobrar');
    expect(badge?.describe(3)).toBe('3 mesas por cobrar');
  });
});
