/**
 * Mock implementation of the BookingAdapter port (see ports/booking.js).
 * Wraps the pure createBooking with the real clock — this is the only place
 * in the booking path that touches Date.now(). No network call, no payment,
 * no real reservation: every booking it produces carries simulated: true.
 */

import { createBooking } from '../domain/booking/createBooking.js';

/** @returns {import('../ports/booking.js').BookingAdapter} */
export function createMockBooking() {
  return {
    book(request, venueOption, decision) {
      return createBooking(request, venueOption, decision, new Date());
    },
  };
}
