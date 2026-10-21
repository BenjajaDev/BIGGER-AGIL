import { LayoutGrid, MapPinOff } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <>
      <h1 className="visually-hidden">Página no encontrada</h1>
      <EmptyState
        icon={MapPinOff}
        title="No encontramos esta página"
        description="Puede que el enlace esté incompleto."
        action={
          <ButtonLink to="/mesas" variant="secondary">
            <LayoutGrid size={18} aria-hidden="true" />
            Ir a Mesas
          </ButtonLink>
        }
      />
    </>
  );
}
