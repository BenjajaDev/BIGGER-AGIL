import type { Supplier } from '@bigger/shared';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useArchiveSupplier, useSaveSupplier } from '../useInventory';
import styles from './Inventory.module.css';

function SupplierForm({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const save = useSaveSupplier();
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          { id: supplier?.id ?? null, input: { name, phone: phone.trim() === '' ? null : phone } },
          { onSuccess: onDone },
        );
      }}
    >
      <div className={styles.field}>
        <label htmlFor="prov-nombre">Nombre</label>
        <input
          id="prov-nombre"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="prov-fono">WhatsApp (ej.: 56912345678)</label>
        <input
          id="prov-fono"
          inputMode="numeric"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
          }}
        />
      </div>
      {save.error && (
        <p role="alert" className={styles.error}>
          {save.error.message}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          Guardar proveedor
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function SuppliersTab({ suppliers }: { suppliers: readonly Supplier[] }) {
  const archive = useArchiveSupplier();
  const [editing, setEditing] = useState<{ supplier: Supplier | null } | null>(null);
  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={() => {
            setEditing({ supplier: null });
          }}
        >
          Nuevo proveedor
        </Button>
      </div>
      {editing && (
        <Card>
          <SupplierForm
            key={editing.supplier?.id ?? 'nuevo'}
            supplier={editing.supplier}
            onDone={() => {
              setEditing(null);
            }}
          />
        </Card>
      )}
      {suppliers.length === 0 ? (
        <p className={styles.empty}>
          Agrega a tus proveedores para armar la lista de compra por proveedor.
        </p>
      ) : (
        <ul role="list" className={styles.rows}>
          {suppliers.map((supplier) => (
            <Card as="li" key={supplier.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{supplier.name}</span>
                <span className={styles.rowMeta}>
                  {supplier.phone ? `WhatsApp ${supplier.phone}` : 'Sin WhatsApp'}
                </span>
              </div>
              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing({ supplier });
                  }}
                >
                  Editar<span className="visually-hidden"> {supplier.name}</span>
                </Button>
                <Button
                  variant="ghost"
                  disabled={archive.isPending}
                  onClick={() => {
                    archive.mutate(supplier.id);
                  }}
                >
                  Eliminar<span className="visually-hidden"> {supplier.name}</span>
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
