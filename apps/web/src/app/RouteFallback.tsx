import { LoaderCircle } from 'lucide-react';

export function RouteFallback() {
  return (
    <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: '50dvh' }}>
      <LoaderCircle size={28} aria-hidden="true" />
      <span className="visually-hidden">Cargando…</span>
    </div>
  );
}
