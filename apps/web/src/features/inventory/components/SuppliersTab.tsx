import type { Supplier } from '@bigger/shared';
import { MessageCircle, Pencil, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../../../components/form/Field';
import { controlClassName } from '../../../components/form/control';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatPhone, whatsappUrl } from '../supply-text';
import { useArchiveSupplier, useSaveSupplier } from '../useInventory';
import { FormCard } from './FormCard';
import styles from './Inventory.module.css';

function SupplierForm({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const save = useSaveSupplier();
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  return (
    <FormCard
      title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      submitLabel="Guardar proveedor"
      pending={save.isPending}
      error={save.error?.message ?? null}
      onCancel={onDone}
      onSubmit={() => {
        save.mutate(
          { id: supplier?.id ?? null, input: { name, phone: phone.trim() === '' ? null : phone } },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Nombre">
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        )}
      </Field>
      <Field label="WhatsApp" hint="Con código de país y sin espacios, por ejemplo 56912345678.">
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
            }}
          />
        )}
      </Field>
    </FormCard>
  );
}

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
  const archive = useArchiveSupplier();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const close = () => {
    setEditing(null);
    onCloseCreate();
  };
  const edit = (supplier: Supplier) => {
    onCloseCreate();
    setEditing(supplier);
  };
  return (
    <div className={styles.stack}>
      {creating && !editing && <SupplierForm key="nuevo" supplier={null} onDone={close} />}
      {editing && <SupplierForm key={editing.id} supplier={editing} onDone={close} />}
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
        <ul role="list" className={styles.rows}>
          {suppliers.map((supplier) => (
            <Card as="li" key={supplier.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{supplier.name}</span>
                <span className={styles.rowMeta}>
                  {supplier.phone ? `WhatsApp ${formatPhone(supplier.phone)}` : 'Sin WhatsApp'}
                </span>
              </div>
              <div className={styles.actions}>
                <div className={styles.desktopOnly}>
                  {supplier.phone && (
                    <ButtonLink
                      to={whatsappUrl(supplier.phone, 'Hola')}
                      target="_blank"
                      rel="noopener"
                      reloadDocument
                      variant="ghost"
                    >
                      <MessageCircle size={18} aria-hidden="true" />
                      WhatsApp
                      <span className="visually-hidden">
                        {' '}
                        con {supplier.name} (se abre en otra pestaña)
                      </span>
                    </ButtonLink>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      edit(supplier);
                    }}
                  >
                    <Pencil size={18} aria-hidden="true" />
                    Editar<span className="visually-hidden"> {supplier.name}</span>
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setToDelete(supplier);
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    Eliminar<span className="visually-hidden"> {supplier.name}</span>
                  </Button>
                </div>
                <div className={styles.phoneOnly}>
                  {supplier.phone && (
                    <ButtonLink
                      to={whatsappUrl(supplier.phone, 'Hola')}
                      target="_blank"
                      rel="noopener"
                      reloadDocument
                      variant="ghost"
                      iconOnly
                      aria-label={`WhatsApp con ${supplier.name} (se abre en otra pestaña)`}
                    >
                      <MessageCircle size={18} aria-hidden="true" />
                    </ButtonLink>
                  )}
                  <Button
                    variant="secondary"
                    iconOnly
                    aria-label={`Editar ${supplier.name}`}
                    onClick={() => {
                      edit(supplier);
                    }}
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="danger"
                    iconOnly
                    aria-label={`Eliminar ${supplier.name}`}
                    onClick={() => {
                      setToDelete(supplier);
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={`¿Eliminar a ${toDelete?.name ?? 'el proveedor'}?`}
        description="Deja de aparecer en la lista de proveedores."
        confirmLabel="Eliminar"
        isPending={archive.isPending}
        error={archive.error?.message ?? null}
        onClose={() => {
          setToDelete(null);
        }}
        onConfirm={() => {
          if (toDelete)
            archive.mutate(toDelete.id, {
              onSuccess: () => {
                setToDelete(null);
              },
            });
        }}
      />
    </div>
  );
}
