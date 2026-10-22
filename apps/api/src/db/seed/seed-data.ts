import type { Allergen, OrderChannel, OrderStatus, ProductKind, QuickNote } from '@bigger/shared';

/**
 * Datos de ejemplo tomados de los mockups validados (H3).
 * Se reemplazan por el catálogo real de BIGGER antes del piloto.
 */

export interface SeedRule {
  /** Customization group name. */
  group: string;
  min: number;
  max: number;
}

export interface SeedSize {
  name: string;
  priceClp: number;
  rules?: SeedRule[];
}

export interface SeedPromotion {
  startsOn: string | null;
  endsOn: string | null;
}

export interface SeedProduct {
  name: string;
  subtitle?: string;
  description: string;
  priceClp: number;
  allergens: Allergen[];
  /** With sizes, each size carries its own price and customization rules. */
  sizes?: SeedSize[];
  /** Customization groups offered, by name, in display order. */
  groups?: string[];
  /** Product type (template) name. */
  type?: string;
  promotion?: SeedPromotion;
}

export interface SeedCategory {
  slug: string;
  name: string;
  products: SeedProduct[];
}

export interface SeedModifierGroup {
  name: string;
  minSelections: number;
  maxSelections: number;
  options: { name: string; priceDeltaClp: number }[];
}

export interface SeedCombo {
  categorySlug: string;
  name: string;
  subtitle?: string;
  description: string;
  priceClp: number;
  type?: string;
  promotion?: SeedPromotion;
  slots: {
    name: string;
    isRequired: boolean;
    options: { productName: string; extraPriceClp: number }[];
  }[];
}

export interface SeedProductType {
  name: string;
  description: string;
  kind: ProductKind;
  sizes: SeedSize[];
  groups: string[];
  comboSlots: { name: string; isRequired: boolean }[];
}

/** Fajitas: salsas gratis a elección (regla a validar con BIGGER: opcional, hasta 3). */
const FAJITA = { groups: ['Salsas'], type: 'Fajita' } as const;

const price = (name: string, priceClp: number): SeedProduct => ({
  name,
  description: '',
  priceClp,
  allergens: [],
});

const fajita = (name: string, priceClp: number): SeedProduct => ({
  ...price(name, priceClp),
  groups: [...FAJITA.groups],
  type: FAJITA.type,
});

export const SEED_MODIFIER_GROUPS: readonly SeedModifierGroup[] = [
  {
    name: 'Salsas',
    minSelections: 0,
    maxSelections: 3,
    options: ['Mayonesa', 'Ketchup', 'Mostaza', 'Ají', 'BBQ', 'Salsa verde', 'Ajo', 'Queso'].map(
      (name) => ({ name, priceDeltaClp: 0 }),
    ),
  },
  {
    // Pollo, palta reina y huevo vienen incluidos; atún, churrasco y lengua suben el total de la
    // ensalada grande a $5.400 / $5.600 / $5.600 (recargo sobre $4.900).
    name: 'Proteína',
    minSelections: 0,
    maxSelections: 1,
    options: [
      { name: 'Pollo', priceDeltaClp: 0 },
      { name: 'Palta reina', priceDeltaClp: 0 },
      { name: 'Huevo', priceDeltaClp: 0 },
      { name: 'Atún', priceDeltaClp: 500 },
      { name: 'Churrasco', priceDeltaClp: 700 },
      { name: 'Lengua', priceDeltaClp: 700 },
    ],
  },
  {
    name: 'Vegetales',
    minSelections: 0,
    maxSelections: 4,
    options: [
      'Aceituna',
      'Apio',
      'Arvejas',
      'Betarraga',
      'Brócoli',
      'Cebolla',
      'Choclo',
      'Pepino',
      'Pimentón',
      'Porotos negros',
      'Porotos verdes',
      'Tomate',
      'Zanahoria',
    ].map((name) => ({ name, priceDeltaClp: 0 })),
  },
  {
    name: 'Relleno',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { name: 'Crema pastelera', priceDeltaClp: 0 },
      { name: 'Manjar', priceDeltaClp: 0 },
    ],
  },
];

/** Grande = 1 proteína + 4 vegetales (incluye lechuga) · Pequeña = 3 vegetales, sin proteína. */
const SALAD_SIZES: SeedSize[] = [
  {
    name: 'Grande',
    priceClp: 4900,
    rules: [
      { group: 'Proteína', min: 1, max: 1 },
      { group: 'Vegetales', min: 4, max: 4 },
    ],
  },
  {
    name: 'Pequeña',
    priceClp: 2500,
    rules: [
      { group: 'Proteína', min: 0, max: 0 },
      { group: 'Vegetales', min: 3, max: 3 },
    ],
  },
];

export const SEED_PRODUCT_TYPES: readonly SeedProductType[] = [
  {
    name: 'Ensalada armable',
    description: 'Grande con 1 proteína y 4 vegetales; pequeña con 3 vegetales.',
    kind: 'single',
    sizes: SALAD_SIZES,
    groups: ['Proteína', 'Vegetales'],
    comboSlots: [],
  },
  {
    name: 'Fajita',
    description: 'Fajita con salsas a elección.',
    kind: 'single',
    sizes: [],
    groups: ['Salsas'],
    comboSlots: [],
  },
];

export const SEED_CATEGORIES: readonly SeedCategory[] = [
  {
    slug: 'churrascos',
    name: 'Churrascos',
    products: [
      price('Solo', 3400),
      price('Chacarero', 4590),
      price('Italiano', 4900),
      price('Luco', 3990),
      price('Chemilico', 5190),
    ],
  },
  {
    slug: 'sandwiches-especiales',
    name: 'Sándwiches especiales',
    products: [
      price('Napolitano', 3800),
      price('Lechuga Jamón Tomate', 3500),
      price('Lechuga Tomate Quesillo', 3500),
      price('Lechuga Tomate Jamón Quesillo', 4200),
    ],
  },
  {
    slug: 'fajitas-vacuno',
    name: 'Fajitas de vacuno',
    products: [
      fajita('Italiana', 4900),
      fajita('Granjera', 4200),
      fajita('Chacarera', 4300),
      fajita('Chilena', 5000),
      fajita('Americana', 5200),
    ],
  },
  {
    slug: 'fajitas-pollo',
    name: 'Fajitas de pollo',
    products: [fajita('Italiana pollo', 4500), fajita('Pollo 1', 3900), fajita('Pollo 2', 4200)],
  },
  {
    slug: 'fajitas-especiales',
    name: 'Fajitas especiales',
    products: [
      fajita('Napolitana', 3900),
      fajita('Vegetariana', 3500),
      fajita('Marina', 4500),
      fajita('Atún', 4500),
    ],
  },
  {
    slug: 'ensaladas',
    name: 'Ensaladas',
    products: [
      {
        name: 'Arma tu ensalada',
        subtitle: 'Grande o pequeña, con lechuga incluida',
        description: '',
        priceClp: 2500,
        allergens: [],
        sizes: SALAD_SIZES,
        groups: ['Proteína', 'Vegetales'],
        type: 'Ensalada armable',
      },
      price('César', 3800),
    ],
  },
  {
    slug: 'pasteles',
    name: 'Pasteles',
    products: [
      { ...price('Media luna', 1300), groups: ['Relleno'] },
      price('Pie limón', 1300),
      price('Kuchen manzana', 1300),
      price('Kuchen nuez', 1300),
      price('Roll canela', 1300),
      price('Crumbl cookies rellenas', 2700),
      price('Cheesecake Berries', 3900),
      price('Cheesecake Maracuyá', 3900),
      price('Trozo queque', 900),
      price('Muffins Chips', 1300),
      price('Cuchuflís bañados artesanales', 1500),
      price('Galletas bañadas artesanales', 1500),
      price('Facturas', 1300),
    ],
  },
];

/** El catálogo real no tiene combos todavía; se crean desde Configuración. */
export const SEED_COMBOS: readonly SeedCombo[] = [];

export const SEED_TABLE_COUNT = 10;

export interface SeedOrderItem {
  productName: string;
  quantity: number;
  quickNotes?: QuickNote[];
}

export interface SeedOrder {
  channel: OrderChannel;
  status: OrderStatus;
  tableNumber?: number;
  customerName?: string;
  pickupInMinutes?: number;
  minutesAgo: number;
  items: SeedOrderItem[];
}

export const SEED_DEMO_ORDERS: readonly SeedOrder[] = [
  {
    channel: 'dine-in',
    status: 'new',
    tableNumber: 2,
    minutesAgo: 1,
    items: [
      { productName: 'Chacarero', quantity: 2 },
      { productName: 'Napolitano', quantity: 1, quickNotes: ['takeaway'] },
    ],
  },
  {
    channel: 'whatsapp',
    status: 'preparing',
    customerName: 'Camila R.',
    pickupInMinutes: 20,
    minutesAgo: 6,
    items: [
      { productName: 'Italiano', quantity: 2 },
      { productName: 'Pie limón', quantity: 1 },
    ],
  },
  {
    channel: 'dine-in',
    status: 'preparing',
    tableNumber: 5,
    minutesAgo: 9,
    items: [
      { productName: 'Italiana', quantity: 1 },
      { productName: 'Kuchen manzana', quantity: 1 },
    ],
  },
  {
    channel: 'dine-in',
    status: 'ready',
    tableNumber: 8,
    minutesAgo: 12,
    items: [{ productName: 'Roll canela', quantity: 3 }],
  },
  {
    channel: 'dine-in',
    status: 'delivered',
    tableNumber: 4,
    minutesAgo: 25,
    items: [
      { productName: 'Luco', quantity: 2 },
      { productName: 'Cheesecake Berries', quantity: 1 },
    ],
  },
];
