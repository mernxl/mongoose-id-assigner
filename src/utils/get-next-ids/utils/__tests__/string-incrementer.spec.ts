import { stringIncrementer } from '../string-incrementer';

describe('stringIncrementer()', () => {
  const id1 = '0000';
  const id2 = '15T2459';
  const id3 = 'SPEC-7382-4344-3232';

  it('should increment a given id', () => {
    expect(stringIncrementer(id1)).toBe('0001');
  });

  it('should increment with separator provided', () => {
    expect(stringIncrementer(id2, 'T')).toBe('15T2460');
    expect(stringIncrementer(id3, '-')).toBe('SPEC-7382-4344-3233');
  });

  it('should throw error if no separator provided and traverses unknowns', () => {
    expect(() => stringIncrementer(id2)).toThrow();
  });
});
