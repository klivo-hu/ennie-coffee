import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('folds Hungarian accents, including the double acutes', () => {
    expect(slugify('Ízesített jegeskávé')).toBe('izesitett-jegeskave');
    expect(slugify('Fűszeres őszi tea')).toBe('fuszeres-oszi-tea');
  });

  it('produces URL-safe output', () => {
    expect(slugify('  Matcha & chai!  ')).toBe('matcha-es-chai');
    expect(slugify('Málna–menta limonádé (3,5 dl)')).toBe('malna-menta-limonade-3-5-dl');
  });
});
