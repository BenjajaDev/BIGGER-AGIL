import type { PurchaseGroup } from '@bigger/shared';
import { Copy, MessageCircle, PackagePlus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { formatClp } from '../../../lib/format';
import { formatPhone, formatQuantity, purchaseMessage, whatsappUrl } from '../supply-text';
import styles from './Lists.module.css';

function GroupCard({
  group,
  onArrive,
}: {
  group: PurchaseGroup;
  onArrive: (supplyId: string, quantity: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const message = purchaseMessage(group);
  const name = group.supplier?.name ?? 'Sin proveedor asignado';
  const count = group.items.length;
  const noun = count === 1 ? 'insumo' : 'insumos';
  const description = group.supplier?.phone
    ? `${String(count)} ${noun} · WhatsApp ${formatPhone(group.supplier.phone)}`
    : `${String(count)} ${noun}`;
  return (
    <Card as="section" aria-label={`Compra a ${name}`} className={styles.stack}>
      <SectionHeader title={name} level={3} description={description} />
      <ul role="list" className={styles.purchaseList}>
        {group.items.map((item) => (
          <li key={item.supplyId} className={styles.purchaseRow}>
            <span className={styles.purchaseText}>
              <span className={styles.purchaseName}>{item.name}</span>
              <span className={styles.purchaseAsk}>
                Hay {formatQuantity(item.stock, item.unit)} · Pedir{' '}
                <strong>{formatQuantity(item.suggestedQuantity, item.unit)}</strong>
              </span>
              <span className={styles.money}>{formatClp(item.estimatedCostClp)}</span>
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                onArrive(item.supplyId, item.suggestedQuantity);
              }}
            >
              <PackagePlus size={18} aria-hidden="true" />
              Llegó<span className="visually-hidden">: {item.name}</span>
            </Button>
          </li>
        ))}
      </ul>
      <p className={styles.total}>
        Total estimado <strong>{formatClp(group.totalClp)}</strong>
      </p>
      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(message).then(() => {
              setCopied(true);
            });
          }}
        >
          <Copy size={18} aria-hidden="true" />
          {copied ? 'Lista copiada' : 'Copiar la lista'}
        </Button>
        {group.supplier?.phone ? (
          <ButtonLink
            to={whatsappUrl(group.supplier.phone, message)}
            target="_blank"
            rel="noopener"
            reloadDocument
            variant="primary"
          >
            <MessageCircle size={18} aria-hidden="true" />
            Enviar por WhatsApp
            <span className="visually-hidden"> a {name} (se abre en otra pestaña)</span>
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}

export function PurchasesTab({
  groups,
  onArrive,
}: {
  groups: readonly PurchaseGroup[];
  onArrive: (supplyId: string, quantity: number) => void;
}) {
  if (groups.length === 0)
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No hay nada que comprar"
        description="Todo el stock está sobre su mínimo."
      />
    );
  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        Se sugiere comprar lo necesario para llegar al doble del stock mínimo. Cuando llegue, toca
        «Llegó».
      </p>
      {groups.map((group) => (
        <GroupCard key={group.supplier?.id ?? 'sin-proveedor'} group={group} onArrive={onArrive} />
      ))}
    </div>
  );
}
