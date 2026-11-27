import type { LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { cx } from '../../lib/cx';
import styles from './Tabs.module.css';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  countTone?: 'neutral' | 'warning' | 'danger';
}

export interface TabsProps<T extends string> {
  label: string;
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  idBase: string;
}

// eslint-disable-next-line react-refresh/only-export-components -- helpers must live next to Tabs
export function tabId(idBase: string, value: string): string {
  return `${idBase}-tab-${value}`;
}

// eslint-disable-next-line react-refresh/only-export-components -- helpers must live next to Tabs
export function tabPanelProps(idBase: string, value: string) {
  return {
    id: `${idBase}-panel-${value}`,
    role: 'tabpanel' as const,
    'aria-labelledby': tabId(idBase, value),
    tabIndex: 0 as const,
  };
}

export function Tabs<T extends string>({ label, items, value, onChange, idBase }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  function select(index: number) {
    const item = items[index];
    if (!item) return;
    onChange(item.value);
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const current = items.findIndex((item) => item.value === value);
    const last = items.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = current >= last ? 0 : current + 1;
        break;
      case 'ArrowLeft':
        next = current <= 0 ? last : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
  }

  return (
    <div className={styles.scroller}>
      <div ref={listRef} role="tablist" aria-label={label} className={styles.tabs}>
        {items.map(({ value: itemValue, label: itemLabel, icon: Icon, count, countTone }) => {
          const selected = itemValue === value;
          return (
            <button
              key={itemValue}
              type="button"
              role="tab"
              id={tabId(idBase, itemValue)}
              aria-selected={selected}
              aria-controls={`${idBase}-panel-${itemValue}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => {
                onChange(itemValue);
              }}
              onKeyDown={onKeyDown}
            >
              {Icon && <Icon size={18} aria-hidden="true" />}
              {itemLabel}
              {count !== undefined && (
                <span className={cx(styles.count, styles[countTone ?? 'neutral'])}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
