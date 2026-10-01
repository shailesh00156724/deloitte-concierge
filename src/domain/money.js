/**
 * Money is always integer pence (see types.js) — never float pounds — so that
 * budget and threshold comparisons are exact and deterministic.
 */

/**
 * @param {number} pounds
 * @returns {import('./types.js').Money}
 */
export function gbp(pounds) {
  return { amount: Math.round(pounds * 100), currency: 'GBP' };
}

/**
 * @param {import('./types.js').Money} money
 * @returns {string}
 */
export function formatMoney(money) {
  const pounds = money.amount / 100;
  const formatted = pounds.toLocaleString('en-GB', {
    minimumFractionDigits: pounds % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `£${formatted}`;
}

/**
 * @param {import('./types.js').Money} a
 * @param {import('./types.js').Money} b
 * @returns {import('./types.js').Money}
 */
export function lowerMoney(a, b) {
  return a.amount <= b.amount ? a : b;
}
