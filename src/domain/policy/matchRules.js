/**
 * Pure rule matching + precedence. No DOM, no I/O.
 *
 * Determinism is structural here, not incidental: candidates are sorted by a
 * fixed, explicit total order (specificity, then effectiveFrom, then id) so the
 * same rule set + inputs always yields the same matched rule regardless of the
 * order rules happen to be stored in.
 */

/**
 * @param {{ audience: import('../types.js').AudienceCategory, eventType: import('../types.js').EventType, eventDate: string }} inputs
 * @param {import('../types.js').PolicyRule[]} rules
 * @returns {import('../types.js').PolicyRule[]} candidates sorted highest-precedence first
 */
export function matchRules(inputs, rules) {
  const candidates = rules.filter((rule) => {
    // Missing audience/eventType means we cannot safely match anything — that
    // is exactly the "insufficient data" half of Unknown, not a rule-matching
    // failure, so it is handled the same way as zero candidates below.
    if (!inputs.audience || !inputs.eventType) return false;
    if (rule.audience !== inputs.audience) return false;

    const eventTypeMatches =
      rule.eventTypes === 'all' || rule.eventTypes.includes(inputs.eventType);
    if (!eventTypeMatches) return false;

    // Evaluated against the event date, not "now" — a policy decision must
    // stay reproducible after the event has passed.
    if (inputs.eventDate < rule.effectiveFrom) return false;
    if (rule.effectiveTo !== null && inputs.eventDate >= rule.effectiveTo) return false;

    return true;
  });

  return candidates.slice().sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    if (a.effectiveFrom !== b.effectiveFrom) return a.effectiveFrom < b.effectiveFrom ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
