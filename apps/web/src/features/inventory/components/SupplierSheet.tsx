import { SupplierInputSchema, type Supplier } from '@bigger/shared';
import { Trash2 } from 'lucide-react';
import { useId, useState, type SyntheticEvent } from 'react';
import { Field } from '../../../components/form/Field';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Sheet, SheetFooter } from '../../../components/ui/Sheet';
import { useArchiveSupplier, useSaveSupplier } from '../useInventory';
import styles from './Lists.module.css';

function SupplierBody({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const formId = useId();
  const save = useSaveSupplier();
  const archive = useArchiveSupplier();
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [confirming, setConfirming] = useState(false);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = SupplierInputSchema.safeParse({
      name,
      phone: phone.trim() === '' ? null : phone,
    });
    if (!parsed.success) {
      const next: { name?: string; phone?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'name') next.name ??= issue.message;
        if (issue.path[0] === 'phone') next.phone ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate({ id: supplier?.id ?? null, input: parsed.data }, { onSuccess: onDone });
  };

  return (
    <>
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <Field label="Nombre" error={errors.name}>
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              autoComplete="off"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          )}
        </Field>
        <Field
          label="WhatsApp (opcional)"
          hint="Con código de país y sin espacios, por ejemplo 56912345678."
          error={errors.phone}
        >
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              inputMode="numeric"
              autoComplete="off"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
              }}
            />
          )}
        </Field>
        {save.error && (
          <p role="alert" className={styles.error}>
            {save.error.message}
          </p>
        )}
      </form>
      {supplier && (
        <Button
          variant="danger"
          onClick={() => {
            setConfirming(true);
          }}
        >
          <Trash2 size={18} aria-hidden="true" />
          Eliminar proveedor
        </Button>
      )}
      <SheetFooter>
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="lg"
          fullWidth
          disabled={save.isPending}
        >
          {save.isPending ? 'Guardando…' : supplier ? 'Guardar cambios' : 'Agregar proveedor'}
        </Button>
      </SheetFooter>
      <ConfirmDialog
        open={confirming}
        title={`¿Eliminar a ${supplier?.name ?? 'el proveedor'}?`}
        description="Deja de aparecer en la lista de proveedores."
        confirmLabel="Eliminar"
        isPending={archive.isPending}
        error={archive.error?.message ?? null}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          if (supplier) archive.mutate(supplier.id, { onSuccess: onDone });
        }}
      />
    </>
  );
}

export function SupplierSheet({
  open,
  supplier,
  onClose,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}>
      {open && <SupplierBody key={supplier?.id ?? 'nuevo'} supplier={supplier} onDone={onClose} />}
    </Sheet>
  );
}
