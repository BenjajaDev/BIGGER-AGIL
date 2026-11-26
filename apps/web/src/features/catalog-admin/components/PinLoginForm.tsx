import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLoginInputSchema, type AdminLoginInput } from '@bigger/shared';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Page } from '../../../components/layout/Page';
import { controlClassName } from '../../../components/form/control';
import { Field } from '../../../components/form/Field';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { cx } from '../../../lib/cx';
import { ApiRequestError } from '../../../services/http-client';
import { useLogin } from '../useCatalogAdmin';
import { FormAlert } from './FormAlert';
import styles from './PinLoginForm.module.css';

export interface PinLoginFormProps {
  title?: string;
  description?: string;
}

export function PinLoginForm({
  title = 'Configuración de la carta',
  description = 'Solo el encargado puede cambiar productos y precios. Ingresa el PIN de administración.',
}: PinLoginFormProps) {
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
    <Page width="narrow" className={styles.wrapper}>
      <Card as="section" className={styles.card} aria-labelledby="pin-titulo">
        <span className={styles.icon}>
          <LockKeyhole size={28} aria-hidden="true" />
        </span>
        <h1 id="pin-titulo" className={styles.title}>
          {title}
        </h1>
        <p className={styles.lead}>{description}</p>
        <FormAlert message={alert} />
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          <Field label="PIN" error={errors.pin?.message}>
            {(control) => (
              <input
                {...control}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
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
            className={styles.submit}
          >
            <LogIn size={20} aria-hidden="true" />
            {login.isPending ? 'Verificando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </Page>
  );
}
