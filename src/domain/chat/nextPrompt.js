/**
 * Decides what to ask next. Pure function over the draft and the fixed
 * MANDATORY_GROUPS order — deterministic and testable without a chat session.
 */

import { MANDATORY_GROUPS } from './slots.js';

function isFilled(draft, key) {
  const value = draft[key];
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return true;
  return true;
}

/**
 * @param {Object} draft
 * @returns {{ done: true } | { done: false, missingKeys: string[], prompt: string }}
 */
export function nextPrompt(draft) {
  for (const group of MANDATORY_GROUPS) {
    const missing = group.filter((slot) => !isFilled(draft, slot.key));
    if (missing.length > 0) {
      const prompt = [...new Set(missing.map((slot) => slot.prompt).filter(Boolean))].join(' ');
      return { done: false, missingKeys: missing.map((s) => s.key), prompt };
    }
  }
  return { done: true };
}
