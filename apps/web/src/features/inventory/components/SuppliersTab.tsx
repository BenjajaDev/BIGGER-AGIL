import type { Supplier } from '@bigger/shared';
import { MessageCircle, Truck } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatPhone, whatsappUrl } from '../supply-text';
import { ListRow } from './ListRow';
import styles from './Lists.module.css';
import { SupplierSheet } from './SupplierSheet';

export function SuppliersTab({
  suppliers,
  creating,
  onCreate,
  onCloseCreate,
}: {
  suppliers: readonly Supplier[];
  creating: boolean;
  onCreate: () => void;
  onCloseCreate: () => void;
}) {
  const [editing, setEditing] = useState<Supplier | null>(null);
  const close = () => {
    setEditing(null);
    onCloseCreate();
  };
  return (
    <div className={styles.stack}>
      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Todavía no hay proveedores"
          description="Agrega a tus proveedores para armar la lista de compra por proveedor."
          action={
            <Button variant="primary" onClick={onCreate}>
              Nuevo proveedor
            </Button>
          }
        />
      ) : (
        <ul role="list" className={styles.rows} aria-label="Proveedores">
          {suppliers.map((supplier) => (
            <ListRow
              key={supplier.id}
              title={supplier.name}
              meta={supplier.phone ? `WhatsApp ${formatPhone(supplier.phone)}` : 'Sin WhatsApp'}
              label={`${supplier.name}, ${supplier.phone ? `WhatsApp ${formatPhone(supplier.phone)}` : 'sin WhatsApp'}. Editar`}
              onOpen={() => {
                setEditing(supplier);
              }}
              side={
                supplier.phone ? (
                  <ButtonLink
                    to={whatsappUrl(supplier.phone, 'Hola')}
                    target="_blank"
                    rel="noopener"
                    reloadDocument
                    variant="secondary"
                    iconOnly
                    className={styles.sideLink}
                    aria-label={`WhatsApp con ${supplier.name} (se abre en otra pestaña)`}
                  >
                    <MessageCircle size={20} aria-hidden="true" />
                  </ButtonLink>
                ) : undefined
              }
            />
          ))}
        </ul>
      )}
      <SupplierSheet open={creating || editing !== null} supplier={editing} onClose={close} />
    </div>
  );
}
