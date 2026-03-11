const { greet, isEven } = require('../src/index');

describe('greet', () => {
  test('returns greeting with the given name', () => {
    expect(greet('World')).toBe('Hello, World!');
  });

  test('trims whitespace from the name', () => {
    expect(greet('  Alice  ')).toBe('Hello, Alice!');
  });

  test('throws on empty string', () => {
    expect(() => greet('')).toThrow(TypeError);
    expect(() => greet('   ')).toThrow(TypeError);
  });

  test('throws on non-string input', () => {
    expect(() => greet(42)).toThrow(TypeError);
    expect(() => greet(null)).toThrow(TypeError);
    expect(() => greet(undefined)).toThrow(TypeError);
  });
});

describe('isEven', () => {
  test('returns true for even numbers', () => {
    expect(isEven(0)).toBe(true);
    expect(isEven(2)).toBe(true);
    expect(isEven(-4)).toBe(true);
  });

  test('returns false for odd numbers', () => {
    expect(isEven(1)).toBe(false);
    expect(isEven(3)).toBe(false);
    expect(isEven(-7)).toBe(false);
  });

  test('throws on non-number input', () => {
    expect(() => isEven('2')).toThrow(TypeError);
    expect(() => isEven(null)).toThrow(TypeError);
  });

  test('throws on Infinity and NaN', () => {
    expect(() => isEven(Infinity)).toThrow(TypeError);
    expect(() => isEven(NaN)).toThrow(TypeError);
  });
});
