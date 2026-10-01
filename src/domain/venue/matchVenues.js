/**
 * Pure venue filtering, affordability flagging and ranking. No DOM, no I/O.
 *
 * Deliberately does not feed venue cost back into evaluatePolicy: the policy
 * decides the budget, this just flags venues against the budget the policy
 * already produced (decision.budget.effectivePerAttendee). Doing it the
 * other way round — venue cost affecting the policy decision — would make
 * selecting a venue invalidate the very decision that authorised it.
 *
 * Determinism is structural here too, exactly as in matchRules.js:
 * candidates are sorted by a fixed, explicit total order (within-budget
 * first, then rating desc, then price asc, then id) so the same venues +
 * criteria always yield the same ranking regardless of array order.
 */

/**
 * @param {{ eventType: import('../types.js').EventType, attendeeCount: number, alcoholRequested: boolean, budgetPerAttendee: import('../types.js').Money|null }} criteria
 * @param {import('../types.js').Venue[]} venues
 * @returns {import('../types.js').VenueOption[]} options sorted highest-preference first
 */
export function matchVenues(criteria, venues) {
  const { eventType, attendeeCount, alcoholRequested, budgetPerAttendee } = criteria;

  const candidates = venues.filter((venue) => {
    if (venue.maxCapacity < attendeeCount) return false;
    if (!venue.suitableFor.includes(eventType)) return false;
    if (alcoholRequested && !venue.servesAlcohol) return false;
    return true;
  });

  const options = candidates.map((venue) => {
    const estimatedTotal = { amount: venue.perHeadFrom.amount * attendeeCount, currency: 'GBP' };
    const withinBudget = !budgetPerAttendee || venue.perHeadFrom.amount <= budgetPerAttendee.amount;
    const overBudgetBy = withinBudget
      ? null
      : { amount: venue.perHeadFrom.amount - budgetPerAttendee.amount, currency: 'GBP' };

    return { venue, estimatedTotal, withinBudget, overBudgetBy };
  });

  return options.slice().sort((a, b) => {
    if (a.withinBudget !== b.withinBudget) return a.withinBudget ? -1 : 1;
    if (b.venue.rating !== a.venue.rating) return b.venue.rating - a.venue.rating;
    if (a.venue.perHeadFrom.amount !== b.venue.perHeadFrom.amount) {
      return a.venue.perHeadFrom.amount - b.venue.perHeadFrom.amount;
    }
    return a.venue.id < b.venue.id ? -1 : a.venue.id > b.venue.id ? 1 : 0;
  });
}
