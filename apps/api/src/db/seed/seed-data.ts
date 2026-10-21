import type { Allergen, OrderChannel, OrderStatus, QuickNote } from '@bigger/shared';

/**
 * Datos de ejemplo tomados de los mockups validados (H3).
 * Se reemplazan por el catálogo real de BIGGER antes del piloto.
 */

export interface SeedProduct {
  name: string;
  description: string;
  priceClp: number;
  allergens: Allergen[];
}

export interface SeedCategory {
  slug: string;
  name: string;
  products: SeedProduct[];
}

const PASTRY_ALLERGENS: Allergen[] = ['gluten', 'lacteos', 'huevo'];

export const SEED_CATEGORIES: readonly SeedCategory[] = [
  {
    slug: 'cafes',
    name: 'Cafés',
    products: [
      {
        name: 'Espresso',
        description: 'Café de grano recién molido.',
        priceClp: 1800,
        allergens: [],
      },
      {
        name: 'Americano',
        description: 'Espresso alargado con agua caliente.',
        priceClp: 2000,
        allergens: [],
      },
      {
        name: 'Capuchino',
        description: 'Espresso, leche vaporizada y espuma.',
        priceClp: 2500,
        allergens: ['lacteos'],
      },
      {
        name: 'Latte',
        description: 'Espresso con abundante leche vaporizada.',
        priceClp: 2700,
        allergens: ['lacteos'],
      },
    ],
  },
  {
    slug: 'pasteleria',
    name: 'Pastelería',
    products: [
      {
        name: 'Kuchen de frambuesa',
        description: 'Masa casera, crema pastelera y frambuesas.',
        priceClp: 3200,
        allergens: PASTRY_ALLERGENS,
      },
      {
        name: 'Torta mil hojas',
        description: 'Hojarasca, manjar y crema chantilly.',
        priceClp: 3800,
        allergens: PASTRY_ALLERGENS,
      },
      {
        name: 'Pie de limón',
        description: 'Base crocante, crema de limón y merengue.',
        priceClp: 3000,
        allergens: PASTRY_ALLERGENS,
      },
      {
        name: 'Brownie',
        description: 'Chocolate intenso con nueces.',
        priceClp: 2200,
        allergens: [...PASTRY_ALLERGENS, 'frutos-secos'],
      },
      {
        name: 'Medialuna',
        description: 'Hojaldre de mantequilla.',
        priceClp: 1200,
        allergens: PASTRY_ALLERGENS,
      },
      {
        name: 'Alfajor de maicena',
        description: 'Relleno de manjar y coco rallado.',
        priceClp: 1000,
        allergens: PASTRY_ALLERGENS,
      },
      {
        name: 'Cheesecake',
        description: 'Queso crema sobre base de galleta.',
        priceClp: 3500,
        allergens: PASTRY_ALLERGENS,
      },
      {
        name: 'Tartaleta de fruta',
        description: 'Crema pastelera y fruta de temporada.',
        priceClp: 3300,
        allergens: PASTRY_ALLERGENS,
      },
    ],
  },
  {
    slug: 'helados',
    name: 'Helados',
    products: [
      {
        name: 'Helado 1 sabor',
        description: 'Helado artesanal en vaso o cono.',
        priceClp: 2000,
        allergens: ['lacteos'],
      },
      {
        name: 'Helado 2 sabores',
        description: 'Dos sabores de helado artesanal.',
        priceClp: 2800,
        allergens: ['lacteos'],
      },
    ],
  },
  {
    slug: 'sandwiches',
    name: 'Sándwiches',
    products: [
      {
        name: 'Sándwich ave palta',
        description: 'Pan amasado, pollo y palta.',
        priceClp: 4200,
        allergens: ['gluten'],
      },
      {
        name: 'Sándwich jamón queso',
        description: 'Pan de molde tostado.',
        priceClp: 3200,
        allergens: ['gluten', 'lacteos'],
      },
    ],
  },
  {
    slug: 'bebidas',
    name: 'Bebidas y jugos',
    products: [
      {
        name: 'Jugo natural',
        description: 'Fruta de temporada, sin azúcar añadida.',
        priceClp: 2500,
        allergens: [],
      },
      {
        name: 'Agua mineral',
        description: 'Con o sin gas, 500 ml.',
        priceClp: 1200,
        allergens: [],
      },
    ],
  },
];

export interface SeedModifierGroup {
  name: string;
  minSelections: number;
  maxSelections: number;
  options: { name: string; priceDeltaClp: number }[];
  /** Products (by name) that offer this customization. */
  appliesTo: string[];
}

export const SEED_MODIFIER_GROUPS: readonly SeedModifierGroup[] = [
  {
    name: 'Tamaño',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { name: 'Normal', priceDeltaClp: 0 },
      { name: 'Grande', priceDeltaClp: 600 },
    ],
    appliesTo: ['Americano', 'Capuchino', 'Latte'],
  },
  {
    name: 'Tipo de leche',
    minSelections: 0,
    maxSelections: 1,
    options: [
      { name: 'Entera', priceDeltaClp: 0 },
      { name: 'Sin lactosa', priceDeltaClp: 300 },
      { name: 'Vegetal', priceDeltaClp: 500 },
    ],
    appliesTo: ['Capuchino', 'Latte'],
  },
  {
    name: 'Extras',
    minSelections: 0,
    maxSelections: 3,
    options: [
      { name: 'Crema', priceDeltaClp: 400 },
      { name: 'Canela', priceDeltaClp: 0 },
      { name: 'Shot extra de café', priceDeltaClp: 700 },
    ],
    appliesTo: ['Americano', 'Capuchino', 'Latte'],
  },
];

export interface SeedCombo {
  categorySlug: string;
  name: string;
  description: string;
  priceClp: number;
  slots: { name: string; options: { productName: string; extraPriceClp: number }[] }[];
}

export const SEED_COMBO_CATEGORY = { slug: 'combos', name: 'Combos' } as const;

export const SEED_COMBOS: readonly SeedCombo[] = [
  {
    categorySlug: SEED_COMBO_CATEGORY.slug,
    name: 'Once BIGGER',
    description: 'Un café y un dulce a elección.',
    priceClp: 5200,
    slots: [
      {
        name: 'Café a elección',
        options: [
          { productName: 'Americano', extraPriceClp: 0 },
          { productName: 'Capuchino', extraPriceClp: 0 },
          { productName: 'Latte', extraPriceClp: 200 },
        ],
      },
      {
        name: 'Dulce a elección',
        options: [
          { productName: 'Kuchen de frambuesa', extraPriceClp: 0 },
          { productName: 'Medialuna', extraPriceClp: 0 },
          { productName: 'Torta mil hojas', extraPriceClp: 600 },
        ],
      },
    ],
  },
];

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
      { productName: 'Capuchino', quantity: 2, quickNotes: ['no-sugar'] },
      { productName: 'Torta mil hojas', quantity: 1, quickNotes: ['takeaway'] },
    ],
  },
  {
    channel: 'whatsapp',
    status: 'preparing',
    customerName: 'Camila R.',
    pickupInMinutes: 20,
    minutesAgo: 6,
    items: [
      { productName: 'Capuchino', quantity: 2 },
      { productName: 'Kuchen de frambuesa', quantity: 1 },
    ],
  },
  {
    channel: 'dine-in',
    status: 'preparing',
    tableNumber: 5,
    minutesAgo: 9,
    items: [
      { productName: 'Sándwich ave palta', quantity: 1 },
      { productName: 'Jugo natural', quantity: 1 },
    ],
  },
  {
    channel: 'dine-in',
    status: 'ready',
    tableNumber: 8,
    minutesAgo: 12,
    items: [{ productName: 'Helado 2 sabores', quantity: 3 }],
  },
  {
    channel: 'dine-in',
    status: 'delivered',
    tableNumber: 4,
    minutesAgo: 25,
    items: [
      { productName: 'Capuchino', quantity: 2 },
      { productName: 'Torta mil hojas', quantity: 1 },
      { productName: 'Alfajor de maicena', quantity: 1 },
    ],
  },
];
