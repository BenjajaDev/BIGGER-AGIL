import { SingleProductInputSchema } from '@bigger/shared';
import { quickProductInput } from './quick-product';

describe('quickProductInput', () => {
  it('builds a complete, valid simple product from name, category and price', () => {
    const input = quickProductInput({
      categoryId: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
      name: 'Kuchen de nuez',
      priceClp: 2200,
    });
    expect(SingleProductInputSchema.safeParse(input).success).toBe(true);
    expect(input).toMatchObject({ kind: 'single', priceClp: 2200, isAvailable: true, sizes: [] });
  });
});
