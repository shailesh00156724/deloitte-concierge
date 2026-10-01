/**
 * VenueSearchAdapter port. Documents the contract only — this file has no
 * runtime code. Any adapter (the seed-data mock now, a real comparison-site
 * API later) must satisfy this shape, so main.js never talks to a venue data
 * source directly.
 *
 * @typedef {Object} VenueSearchAdapter
 * @property {(criteria: { eventType: import('../domain/types.js').EventType, attendeeCount: number, alcoholRequested: boolean, budgetPerAttendee: import('../domain/types.js').Money|null }) => import('../domain/types.js').VenueOption[]} searchVenues
 */

export {};
