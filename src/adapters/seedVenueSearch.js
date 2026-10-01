/**
 * Seed-data implementation of the VenueSearchAdapter port (see
 * ports/venueSearch.js). Wraps the pure matchVenues over the fictional
 * venues.seed.js listing — no network, deterministic, offline.
 */

import { matchVenues } from '../domain/venue/matchVenues.js';
import { venues } from '../domain/seed/venues.seed.js';

/** @returns {import('../ports/venueSearch.js').VenueSearchAdapter} */
export function createSeedVenueSearch() {
  return {
    searchVenues(criteria) {
      return matchVenues(criteria, venues);
    },
  };
}
