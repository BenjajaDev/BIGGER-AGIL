import { CategoryInputSchema, type AdminCategory, type CategoryInput } from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { controlClassName } from '../../components/form/control';
import { Field } from '../../components/form/Field';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cx } from '../../lib/cx';
import { pluralize } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FormAlert } from './components/FormAlert';
import { applyServerErrors } from './form-errors';
import {
  useAdminCategories,
  useArchiveCategory,
  useRestoreCategory,
  useSaveCategory,
} from './useCatalogAdmin';

interface CategoryFormProps {
  category?: AdminCategory;
  label: string;
  submitLabel: string;
  primary: boolean;
  onDone?: () => void;
}

function CategoryForm({ category, label, submitLabel, primary, onDone }: CategoryFormProps) {
  const save = useSaveCategory();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(CategoryInputSchema),
    mode: 'onTouched',
    defaultValues: { name: category?.name ?? '' },
  });

  const onSubmit = form.handleSubmit(async (input) => {
    setAlert(null);
    try {
      await save.mutateAsync({ id: category?.id, input });
      form.reset({ name: '' });
      onDone?.();
    } catch (error) {
      setAlert(applyServerErrors(error, form.setError));
    }
  });

  return (
    <form
      className={styles.subCardHeader}
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      aria-label={label}
    >
      <Field label={label} error={form.formState.errors.name?.message ?? alert ?? undefined}>
        {(control) => (
          <input
            {...control}
            {...form.register('name')}
            className={controlClassName}
            autoComplete="off"
          />
        )}
      </Field>
      <Button type="submit" variant={primary ? 'primary' : 'secondary'} disabled={save.isPending}>
        {primary && <Plus size={20} aria-hidden="true" />}
        {submitLabel}
      </Button>
      {onDone && (
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      )}
    </form>
  );
}

export function CategoriesPage() {
  const [showArchived, setShowArchived] = useState(false);
  const categoriesQuery = useAdminCategories(showArchived);
  const archive = useArchiveCategory();
  const restore = useRestoreCategory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<AdminCategory | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const closeDialog = () => {
    setPendingArchive(null);
    archive.reset();
  };

  return (
    <section className={styles.page} aria-labelledby="lista-titulo">
      <div className={styles.header}>
        <h1 id="lista-titulo" className={styles.title}>
          Categorías
        </h1>
        <div className={styles.headerActions}>
          <Chip
            pressed={showArchived}
            onClick={() => {
              setShowArchived((value) => !value);
            }}
          >
            Mostrar eliminadas
          </Chip>
        </div>
      </div>

      <Card className={styles.formCard}>
        <CategoryForm label="Nueva categoría" submitLabel="Agregar categoría" primary />
      </Card>
      <FormAlert message={restoreError} />

      <AsyncContent query={categoriesQuery} loadingLabel="Cargando categorías…">
        {(categories) =>
          categories.length === 0 ? (
            <EmptyState icon={FolderTree} title="Todavía no hay categorías" />
          ) : (
            <ul role="list" className={styles.rows}>
              {categories.map((category) => {
                const archived = category.archivedAt !== null;
                return (
                  <Card
                    as="li"
                    key={category.id}
                    padded={false}
                    className={cx(styles.row, archived && styles.rowArchived)}
                  >
                    {editingId === category.id ? (
                      <CategoryForm
                        category={category}
                        label={`Nuevo nombre para «${category.name}»`}
                        submitLabel="Guardar"
                        primary={false}
                        onDone={() => {
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <>
                        <div className={styles.rowMain}>
                          <span className={styles.rowTitle}>
                            {category.name}
                            {archived && (
                              <StatusBadge tone="neutral" icon={Archive} label="Eliminada" />
                            )}
                          </span>
                          <span className={styles.rowMeta}>
                            /carta/{category.slug} ·{' '}
                            {pluralize(category.activeProductCount, 'producto', 'productos')}
                          </span>
                        </div>
                        <div className={styles.rowActions}>
                          {archived ? (
                            <Button
                              variant="secondary"
                              disabled={restore.isPending}
                              onClick={() => {
                                setRestoreError(null);
                                restore.mutate(category.id, {
                                  onError: (error) => {
                                    setRestoreError(error.message);
                                  },
                                });
                              }}
                            >
                              <ArchiveRestore size={18} aria-hidden="true" />
                              Restaurar<span className="visually-hidden"> {category.name}</span>
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setEditingId(category.id);
                                }}
                              >
                                <Pencil size={18} aria-hidden="true" />
                                Renombrar<span className="visually-hidden"> {category.name}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setPendingArchive(category);
                                }}
                              >
                                <Trash2 size={18} aria-hidden="true" />
                                Eliminar<span className="visually-hidden"> {category.name}</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
            </ul>
          )
        }
      </AsyncContent>

      <ConfirmDialog
        open={pendingArchive !== null}
        title={`¿Eliminar «${pendingArchive?.name ?? ''}»?`}
        description="Solo se pueden eliminar categorías sin productos. Dejará de aparecer en la carta y podrás restaurarla después."
        confirmLabel="Eliminar"
        isPending={archive.isPending}
        error={archive.error?.message ?? null}
        onClose={closeDialog}
        onConfirm={() => {
          if (pendingArchive) archive.mutate(pendingArchive.id, { onSuccess: closeDialog });
        }}
      />
    </section>
  );
}
