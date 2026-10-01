/**
 * Builds a mock Booking from a confirmed venue selection. Pure — no DOM, no
 * I/O, no implicit Date.now(); `now` is always passed in. `simulated: true`
 * is set unconditionally: it is structurally impossible for this function
 * to produce a Booking that claims to be real.
 */

import { hashValue } from '../hash.js';

/**
 * @param {import('../types.js').EventRequest} request
 * @param {import('../types.js').VenueOption} venueOption
 * @param {import('../types.js').PolicyDecision} decision
 * @param {Date} now - injected clock; bookedAt is derived from this, never from Date.now()
 * @returns {import('../types.js').Booking}
 */
export function createBooking(request, venueOption, decision, now) {
  const { venue, estimatedTotal } = venueOption;

  const reference = `DC-${hashValue([
    venue.id,
    request.eventDate,
    request.attendeeCount,
    decision.inputsHash,
  ]).toUpperCase()}`;

  return {
    reference,
    venueId: venue.id,
    venueName: venue.name,
    eventDate: request.eventDate,
    startTime: request.startTime,
    attendeeCount: request.attendeeCount,
    estimatedPerHead: venue.perHeadFrom,
    estimatedTotal,
    policyDecisionId: decision.id,
    bookedAt: now.toISOString(),
    simulated: true,
  };
}
