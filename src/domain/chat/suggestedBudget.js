/**
 * Computes the policy's own recommended per-attendee budget from the matched
 * rule's organiser-grade allowance, so the chat can present a figure for the
 * user to confirm rather than asking an open "what's your budget?" question.
 * Pure — reuses the same matchRules/calculateBudget the final policy check
 * uses, with userBudgetCap forced to null so the result is the policy's own
 * allowance, not whatever figure the user may already have typed.
 */

import { matchRules } from '../policy/matchRules.js';
import { calculateBudget } from '../policy/calculateBudget.js';
import { policyRules } from '../seed/policyRules.seed.js';

/**
 * @param {Object} draft
 * @returns {import('../types.js').BudgetCalculation|null} null if no policy
 *   rule covers this combination, or the rule carries no spend control
 */
export function getPolicySuggestedBudget(draft) {
  const candidates = matchRules(
    { audience: draft.audience, eventType: draft.eventType, eventDate: draft.eventDate },
    policyRules
  );
  const rule = candidates[0] ?? null;
  if (!rule) return null;

  const budget = calculateBudget(
    { attendeeCount: draft.attendeeCount ?? 0, userBudgetCap: null, organiserGrade: draft.organiserGrade },
    rule
  );
  return budget.effectivePerAttendee ? budget : null;
}
