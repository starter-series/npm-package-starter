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
 * @param {number} n - The number to check.
 * @returns {boolean} True if the number is even, false otherwise.
 * @example
 * isEven(4); // => true
 * isEven(3); // => false
 */
function isEven(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new TypeError('n must be a finite number');
  }
  return n % 2 === 0;
}

module.exports = { greet, isEven };
