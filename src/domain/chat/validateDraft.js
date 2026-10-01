/**
 * Pure draft validation against the slot registry. Returns one message per
 * invalid mandatory slot; an empty array means the draft is ready to evaluate.
 */

import { SLOTS } from './slots.js';

/**
 * @param {Object} draft
 * @returns {string[]}
 */
export function validateDraft(draft) {
  const errors = [];
  for (const slot of SLOTS) {
    if (!slot.mandatory) continue;
    const error = slot.validate(draft[slot.key]);
    if (error) errors.push(error);
  }
  return errors;
}
