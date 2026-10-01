/**
 * BookingAdapter port. Documents the contract only — this file has no
 * runtime code. The only implementation in this slice is a mock (simulated,
 * no network, no payment); a real adapter would satisfy the same shape.
 *
 * @typedef {Object} BookingAdapter
 * @property {(request: import('../domain/types.js').EventRequest, venueOption: import('../domain/types.js').VenueOption, decision: import('../domain/types.js').PolicyDecision) => import('../domain/types.js').Booking} book
 */

export {};
