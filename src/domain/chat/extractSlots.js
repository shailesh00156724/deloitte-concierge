/**
 * Pure slot extraction. No DOM, no state — given a draft and an utterance,
 * returns which slots were newly filled. Only ever fills slots that are
 * currently empty, so a later message can't silently overwrite an earlier
 * answer (see applyTurn.js for the explicit-correction path, which does
 * allow overwriting via a single targeted slot).
 */

import { SLOTS } from './slots.js';

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return false; // an explicit [] is a confirmed "none", not empty
  return false;
}

/**
 * @param {Object} draft - current EventRequest-shaped draft
 * @param {string} utterance
 * @param {Date} now
 * @returns {{ filled: Array<{key: string, value: any}> }}
 */
export function extractSlots(draft, utterance, now) {
  const filled = [];

  for (const slot of SLOTS) {
    if (slot.freeText) continue; // only filled via an explicit targetSlot turn
    if (!isEmpty(draft[slot.key])) continue;

    const result = slot.parse(utterance, now, draft);
    if (result && result.confidence >= 0.5) {
      filled.push({ key: slot.key, value: result.value });
    }
  }

  return { filled };
}
