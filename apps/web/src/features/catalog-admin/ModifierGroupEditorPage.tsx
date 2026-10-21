import {
  ModifierGroupInputSchema,
  type AdminModifierGroup,
  type ModifierGroupInput,
} from '@bigger/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { SearchX } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { RouteFallback } from '../../app/RouteFallback';
import { controlClassName } from '../../components/form/control';
import { Field } from '../../components/form/Field';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { pluralize } from '../../lib/format';
import styles from './CatalogAdmin.module.css';
import { FormAlert } from './components/FormAlert';
import { ModifierOptionsEditor } from './components/ModifierOptionsEditor';
import { SaveBar } from './components/SaveBar';
import { applyServerErrors } from './form-errors';
import { modifierGroupDefaults } from './form-values';
import { describeSelectionRule } from './selection-rule';
import { useAdminModifierGroup, useSaveModifierGroup } from './useCatalogAdmin';
import { noticeState } from './useFlashNotice';

const BASE_PATH = '/configuracion/personalizaciones';

function ModifierGroupForm({ group }: { group: AdminModifierGroup | undefined }) {
  const save = useSaveModifierGroup();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<ModifierGroupInput>({
    resolver: zodResolver(ModifierGroupInputSchema),
    mode: 'onTouched',
    defaultValues: modifierGroupDefaults(group),
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const rule = describeSelectionRule(watch('minSelections'), watch('maxSelections'));

  const onSubmit = form.handleSubmit(async (input) => {
    setAlert(null);
    try {
      const saved = await save.mutateAsync({ id: group?.id, input });
      await navigate(BASE_PATH, { state: noticeState(`Guardado «${saved.name}»`) });
    } catch (error) {
      setAlert(applyServerErrors(error, form.setError));
    }
  });

  return (
    <FormProvider {...form}>
      <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
        <FormAlert message={alert} />
        <Card as="section" className={styles.formCard} aria-labelledby="regla-titulo">
          <h2 id="regla-titulo" className={styles.sectionTitle}>
            Nombre y regla
          </h2>
          <Field
            label="Nombre"
            hint="Ej.: Tipo de leche, Tamaño, Sabores"
            error={errors.name?.message}
          >
            {(control) => (
              <input
                {...control}
                {...register('name')}
                className={controlClassName}
                autoComplete="off"
              />
            )}
          </Field>
          <div className={styles.grid2}>
            <Field
              label="Mínimo a elegir"
              hint="0 = opcional; 1 o más = obligatorio"
              error={errors.minSelections?.message}
            >
              {(control) => (
                <input
                  {...control}
                  {...register('minSelections', { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  className={controlClassName}
                />
              )}
            </Field>
            <Field label="Máximo a elegir" error={errors.maxSelections?.message}>
              {(control) => (
                <input
                  {...control}
                  {...register('maxSelections', { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  className={controlClassName}
                />
              )}
            </Field>
          </div>
          <p className={styles.summary} aria-live="polite">
            {rule}
          </p>
        </Card>
        <Card as="section" className={styles.formCard} aria-labelledby="opciones-titulo">
          <h2 id="opciones-titulo" className={styles.sectionTitle}>
            Opciones
          </h2>
          <ModifierOptionsEditor />
        </Card>
        <SaveBar cancelTo={BASE_PATH} isPending={save.isPending} />
      </form>
    </FormProvider>
  );
}

export function ModifierGroupEditorPage() {
  const { groupId } = useParams();
  const groupQuery = useAdminModifierGroup(groupId);

  if (groupId && groupQuery.isError) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos esta personalización"
        description={groupQuery.error.message}
        action={<ButtonLink to={BASE_PATH}>Volver a Personalizaciones</ButtonLink>}
      />
    );
  }
  if (groupId && groupQuery.isPending) return <RouteFallback />;

  const group = groupQuery.data;
  return (
    <section className={styles.page} aria-labelledby="editor-titulo">
      <h1 id="editor-titulo" className={styles.title}>
        {group ? `Editar «${group.name}»` : 'Nueva personalización'}
      </h1>
      {group && group.productCount > 0 && (
        <p className={styles.rowMeta}>
          Usada en {pluralize(group.productCount, 'producto', 'productos')}: los cambios se aplican
          a todos.
        </p>
      )}
      <ModifierGroupForm key={group?.id ?? 'nueva'} group={group} />
    </section>
  );
}
