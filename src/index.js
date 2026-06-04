/**
 * Greet someone by name.
 *
 * @param {string} name - The name to greet.
 * @returns {string} A greeting message.
 * @example
 * greet('World'); // => 'Hello, World!'
 */
function greet(name) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('name must be a non-empty string');
  }
  return `Hello, ${name.trim()}!`;
}

/**
 * Check if a number is even.
 *
 * Accepts any finite number. Finite non-integers are neither even nor odd,
 * so they report `false` (e.g. `isEven(2.5) === false`) rather than throwing.
 * Callers that require a true integer should validate with
 * `Number.isInteger(n)` before calling. Non-finite input (`NaN`, `Infinity`)
 * and non-number input throw a `TypeError`.
 *
 * @param {number} n - The finite number to check.
 * @returns {boolean} True if `n` is an even integer; false otherwise (including finite non-integers).
 * @throws {TypeError} If `n` is not a finite number.
 * @example
 * isEven(4);   // => true
 * isEven(3);   // => false
 * isEven(2.5); // => false  (finite, but not an integer)
 */
function isEven(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new TypeError('n must be a finite number');
  }
  return n % 2 === 0;
}

module.exports = { greet, isEven };
