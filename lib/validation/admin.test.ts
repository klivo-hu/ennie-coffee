import { describe, expect, it } from 'vitest';
import {
  productCreateSchema,
  seasonalItemCreateSchema,
  seasonalSectionUpdateSchema,
  socialCreateSchema,
  socialUrlProblem,
} from './admin';

const CATEGORY = '4b1c3d0e-8f2a-4c6b-9d7e-1a2b3c4d5e6f';

describe('productCreateSchema', () => {
  it('accepts a well-formed product and normalizes empty text to null', () => {
    const parsed = productCreateSchema.parse({
      categoryId: CATEGORY,
      name: '  Latte ',
      description: '',
      prices: [{ label: '', amountHuf: 1890 }],
    });
    expect(parsed).toMatchObject({
      name: 'Latte',
      description: null,
      qualifier: 'exact',
      isVisible: true,
    });
    expect(parsed.prices[0]).toEqual({ label: null, amountHuf: 1890 });
  });

  it('rejects money that is not a whole, sane forint amount', () => {
    for (const amountHuf of [18.9, -1, 1_000_001, Number.NaN]) {
      const result = productCreateSchema.safeParse({
        categoryId: CATEGORY,
        name: 'X',
        prices: [{ amountHuf }],
      });
      expect(result.success).toBe(false);
    }
  });

  it('requires a size label when a product has several prices', () => {
    const result = productCreateSchema.safeParse({
      categoryId: CATEGORY,
      name: 'Americano',
      prices: [
        { label: '2,5 dl', amountHuf: 1450 },
        { label: null, amountHuf: 1550 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects control characters and oversized names', () => {
    expect(
      productCreateSchema.safeParse({
        categoryId: CATEGORY,
        name: 'La\u0000tte',
        prices: [{ amountHuf: 1 }],
      }).success,
    ).toBe(false);
    expect(
      productCreateSchema.safeParse({
        categoryId: CATEGORY,
        name: 'x'.repeat(81),
        prices: [{ amountHuf: 1 }],
      }).success,
    ).toBe(false);
  });
});

describe('social links', () => {
  it('only accepts HTTPS links to the platform they claim', () => {
    expect(socialUrlProblem('instagram', 'https://www.instagram.com/enniecoffee/')).toBeNull();
    expect(socialUrlProblem('instagram', 'https://instagram.com.evil.example/x')).not.toBeNull();
    expect(socialUrlProblem('facebook', 'http://facebook.com/enniecoffee')).not.toBeNull();
    expect(
      socialUrlProblem('foodora', 'https://www.foodora.hu/restaurant/gtne/ennie-24-coffee'),
    ).toBeNull();
    expect(socialUrlProblem('website', 'https://user:pass@example.hu')).not.toBeNull();
    expect(socialUrlProblem('website', 'javascript:alert(1)')).not.toBeNull();
  });

  it('validates the URL together with the platform in the create schema', () => {
    const result = socialCreateSchema.safeParse({
      platform: 'tiktok',
      url: 'https://facebook.com/x',
    });
    expect(result.success).toBe(false);
  });
});

describe('seasonal showcase', () => {
  it('accepts an item and normalizes its optional text', () => {
    const parsed = seasonalItemCreateSchema.parse({
      name: '  Sütőtökös latte ',
      description: '',
      ingredients: ['eszpresszó', ' zabtej '],
      prices: [{ label: '', amountHuf: 1690 }],
    });
    expect(parsed).toMatchObject({
      name: 'Sütőtökös latte',
      description: null,
      qualifier: 'exact',
      isVisible: true,
    });
    expect(parsed.ingredients).toEqual(['eszpresszó', 'zabtej']);
  });

  it('refuses more ingredients than the section shows', () => {
    const result = seasonalItemCreateSchema.safeParse({
      name: 'X',
      ingredients: Array.from({ length: 11 }, (_, index) => `összetevő ${index}`),
      prices: [{ amountHuf: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('leaves untouched section fields undefined instead of overwriting them', () => {
    const parsed = seasonalSectionUpdateSchema.parse({ isEnabled: true });
    expect(parsed).toEqual({ isEnabled: true });
  });

  it('only accepts a layout the site can render', () => {
    expect(seasonalSectionUpdateSchema.safeParse({ homeStyle: 'arch' }).success).toBe(true);
    expect(seasonalSectionUpdateSchema.safeParse({ homeStyle: 'carousel' }).success).toBe(false);
  });
});
