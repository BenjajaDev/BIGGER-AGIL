import { CategoryInputSchema, type AdminCategory, type CategoryInput } from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { controlClassName } from '../../components/form/control';
import { Field } from '../../components/form/Field';
import { AsyncContent } from '../../components/ui/AsyncContent';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CoverImage } from '../../components/ui/CoverImage';
import { Chip } from '../../components/ui/Chip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cx } from '../../lib/cx';
import { pluralize } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FormAlert } from './components/FormAlert';
import { ImageField } from './components/ImageField';
import { applyServerErrors } from './form-errors';
import { toImageRef } from './form-values';
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
  /** Editing shows the photo field; a new category starts with just its name. */
  withImage?: boolean;
  onDone?: () => void;
}

const EMPTY_CATEGORY: CategoryInput = { name: '', image: null };

function CategoryForm({
  category,
  label,
  submitLabel,
  primary,
  withImage = false,
  onDone,
}: CategoryFormProps) {
  const save = useSaveCategory();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<z.input<typeof CategoryInputSchema>, unknown, CategoryInput>({
    resolver: zodResolver(CategoryInputSchema),
    mode: 'onTouched',
    defaultValues: category
      ? { name: category.name, image: toImageRef(category.image) }
      : EMPTY_CATEGORY,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    setAlert(null);
    try {
      await save.mutateAsync({ id: category?.id, input });
      form.reset(EMPTY_CATEGORY);
      onDone?.();
    } catch (error) {
      setAlert(applyServerErrors(error, form.setError));
    }
  });

  return (
    <form
      className={withImage ? styles.form : styles.subCardHeader}
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
      {withImage && (
        <Controller
          control={form.control}
          name="image"
          render={({ field, fieldState }) => (
            <ImageField
              legend="Foto de la categoría"
              value={field.value ?? null}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
      <div className={styles.headerActions}>
        <Button type="submit" variant={primary ? 'primary' : 'secondary'} disabled={save.isPending}>
          {primary && <Plus size={20} aria-hidden="true" />}
          {submitLabel}
        </Button>
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
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
                        label={`Nombre de «${category.name}»`}
                        submitLabel="Guardar"
                        primary={false}
                        withImage
                        onDone={() => {
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <>
                        <CoverImage
                          image={category.image}
                          ratio="4 / 3"
                          sizes="4.5rem"
                          className={styles.thumb}
                        />
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
                                Editar<span className="visually-hidden"> {category.name}</span>
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
