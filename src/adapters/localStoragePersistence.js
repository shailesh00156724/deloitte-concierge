/**
 * localStorage implementation of the PersistenceAdapter port (see
 * ports/persistence.js). The only file in the app that touches localStorage.
 */

const STORAGE_KEY = 'deloitte-concierge:session';

/** @returns {import('../ports/persistence.js').PersistenceAdapter} */
export function createLocalStoragePersistence() {
  return {
    loadSession() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    saveSession(session) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Storage full or unavailable (e.g. private browsing) — the session
        // simply won't persist across reloads; not fatal to the current run.
      }
    },
    clearSession() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // see saveSession
      }
    },
  };
}
