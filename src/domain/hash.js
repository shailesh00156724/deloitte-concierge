/**
 * Deterministic, dependency-free hashing shared by evaluatePolicy (decision
 * change-detection) and createBooking (a stable booking reference). Pure —
 * no DOM, no I/O, no clock.
 */

/** Deterministic string serialisation with sorted object keys, for hashing. */
export function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(',')}}`;
}

/**
 * A small, fast, deterministic non-cryptographic hash (FNV-1a, 32-bit).
 * This is change-detection and reference generation — not a security
 * boundary — so collision resistance needs are minimal, and running
 * identically in Node and the browser with zero imports matters more than
 * cryptographic strength (node:crypto is Node-only and would break this
 * client-only app in a browser).
 * @param {*} value - hashed via canonicalJSON first
 * @returns {string} 8 lowercase hex characters
 */
export function hashValue(value) {
  const str = canonicalJSON(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
