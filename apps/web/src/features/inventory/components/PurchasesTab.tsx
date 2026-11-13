import type { PurchaseGroup } from '@bigger/shared';
import { Copy, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { formatClp } from '../../../lib/format';
import { formatQuantity, purchaseMessage, whatsappUrl } from '../supply-text';
import styles from './Inventory.module.css';

function GroupCard({ group }: { group: PurchaseGroup }) {
  const [copied, setCopied] = useState(false);
  const message = purchaseMessage(group);
  const name = group.supplier?.name ?? 'Sin proveedor asignado';
  return (
    <Card as="section" aria-label={`Compra a ${name}`} className={styles.stack}>
      <h2 className={styles.formTitle}>{name}</h2>
      <ul role="list" className={styles.list}>
        {group.items.map((item) => (
          <li key={item.supplyId} className={styles.listRow}>
            <span>{item.name}</span>
            <span className={styles.rowMeta}>
              hay {formatQuantity(item.stock, item.unit)} · pedir{' '}
              <strong>{formatQuantity(item.suggestedQuantity, item.unit)}</strong>
            </span>
            <span className={styles.money}>{formatClp(item.estimatedCostClp)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.total}>
        Total estimado <strong>{formatClp(group.totalClp)}</strong>
      </p>
      <div className={styles.actions}>
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
      </div>
    </Card>
  );
}

export function PurchasesTab({ groups }: { groups: readonly PurchaseGroup[] }) {
  if (groups.length === 0)
    return (
      <p className={styles.fine}>No hay nada que comprar: todo el stock está sobre su mínimo.</p>
    );
  return (
    <div className={styles.stack}>
      <p className={styles.empty}>
        Se sugiere comprar lo necesario para llegar al doble del stock mínimo.
      </p>
      {groups.map((group) => (
        <GroupCard key={group.supplier?.id ?? 'sin-proveedor'} group={group} />
      ))}
    </div>
  );
}
