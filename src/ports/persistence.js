/**
 * PersistenceAdapter port. Documents the contract only — this file has no
 * runtime code. Any adapter (localStorage now, a server later) must satisfy
 * this shape. Keeping it as a port means main.js never talks to localStorage
 * directly, so swapping storage later touches only the adapter.
 *
 * @typedef {Object} PersistenceAdapter
 * @property {() => Object|null} loadSession - returns the last saved session, or null
 * @property {(session: Object) => void} saveSession
 * @property {() => void} clearSession
 */

export {};
