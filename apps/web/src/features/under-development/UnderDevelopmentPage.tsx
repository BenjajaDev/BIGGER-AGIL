import { CircleCheck, Hammer, LayoutGrid } from 'lucide-react';
import type { InDevelopmentModule } from '../../app/navigation';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import styles from './UnderDevelopmentPage.module.css';

export interface UnderDevelopmentPageProps {
  module: InDevelopmentModule;
}

export function UnderDevelopmentPage({ module }: UnderDevelopmentPageProps) {
  const Icon = module.icon;

  return (
    <div className={styles.wrapper}>
      <Card as="section" className={styles.card} aria-labelledby="en-desarrollo-titulo">
        <span className={styles.icon}>
          <Icon size={32} aria-hidden="true" />
        </span>
        <StatusBadge
          tone="highlight"
          icon={Hammer}
          label="En desarrollo"
          className={styles.eyebrow}
        />
        <h1 id="en-desarrollo-titulo" className={styles.title}>
          {module.label} está en desarrollo
        </h1>
        <p className={styles.summary}>
          {module.summary} Lo estamos construyendo junto al equipo de BIGGER; mientras tanto, puedes
          seguir usando Mesas, Pedido y Cocina.
        </p>
        <div className={styles.features}>
          <h2 className={styles.featuresTitle}>Lo que traerá</h2>
          <ul role="list">
            {module.plannedFeatures.map((feature) => (
              <li key={feature} className={styles.feature}>
                <CircleCheck className={styles.featureIcon} size={18} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.meta}>Entrega planificada: {module.plannedIncrement}</p>
        <ButtonLink to="/mesas" variant="secondary">
          <LayoutGrid size={18} aria-hidden="true" />
          Volver a Mesas
        </ButtonLink>
      </Card>
    </div>
  );
}
