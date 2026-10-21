import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLoginInputSchema, type AdminLoginInput } from '@bigger/shared';
import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { controlClassName } from '../../../components/form/control';
import { Field } from '../../../components/form/Field';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { cx } from '../../../lib/cx';
import { ApiRequestError } from '../../../services/http-client';
import { useLogin } from '../useCatalogAdmin';
import { FormAlert } from './FormAlert';
import styles from './PinLoginForm.module.css';

export function PinLoginForm() {
  const login = useLogin();
  const [alert, setAlert] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(AdminLoginInputSchema),
    mode: 'onTouched',
    defaultValues: { pin: '' },
  });

  const onSubmit = handleSubmit(async ({ pin }) => {
    setAlert(null);
    try {
      await login.mutateAsync(pin);
    } catch (error) {
      resetField('pin');
      if (error instanceof ApiRequestError && error.code === 'UNAUTHORIZED') {
        setError('pin', { message: error.message }, { shouldFocus: true });
      } else {
        setAlert(error instanceof Error ? error.message : 'No pudimos verificar el PIN');
      }
    }
  });

  return (
    <div className={styles.wrapper}>
      <Card as="section" className={styles.card} aria-labelledby="pin-titulo">
        <span className={styles.icon}>
          <LockKeyhole size={28} aria-hidden="true" />
        </span>
        <h1 id="pin-titulo" className={styles.title}>
          Configuración de la carta
        </h1>
        <p className={styles.lead}>
          Solo el encargado puede cambiar productos y precios. Ingresa el PIN de administración.
        </p>
        <FormAlert message={alert} />
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          <Field label="PIN" error={errors.pin?.message}>
            {(control) => (
              <input
                {...control}
                {...register('pin')}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={12}
                className={cx(controlClassName, styles.pin)}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={login.isPending}
            style={{ marginTop: 'var(--space-4)' }}
          >
            {login.isPending ? 'Verificando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
