import { stringIncrementer } from '../string-incrementer';

describe('stringIncrementer()', () => {
  const id1 = '0001';
  const id2 = '15T2459';

  it('should increment a given id', () => {
    expect(stringIncrementer(id1)).toBe('0002');
  });

  it('should increment with separator provided', () => {
    expect(stringIncrementer(id2, 'T')).toBe('15T2460');
  });

  it('should throw error if no separator provided and traverses unknowns', () => {
    expect(() => stringIncrementer(id2)).toThrow();
  });
});
