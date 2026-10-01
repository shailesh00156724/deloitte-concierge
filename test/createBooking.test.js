import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBooking } from '../src/domain/booking/createBooking.js';
import { evaluatePolicy } from '../src/domain/policy/evaluatePolicy.js';
import { matchVenues } from '../src/domain/venue/matchVenues.js';
import { policyRules } from '../src/domain/seed/policyRules.seed.js';
import { scenarios } from '../src/domain/seed/scenarios.seed.js';
import { venues } from '../src/domain/seed/venues.seed.js';
import { gbp } from '../src/domain/money.js';

const NOW = new Date('2026-10-01T09:00:00.000Z');

function inputsFromScenario(scenario) {
  return {
    eventRequestId: scenario.id,
    audience: scenario.audience,
    eventType: scenario.eventType,
    organiserGrade: scenario.organiserGrade,
    attendeeCount: scenario.attendeeCount,
    attendeeTags: scenario.attendeeTags,
    alcoholRequested: scenario.alcoholRequested,
    eventDate: scenario.eventDate,
    userBudgetCap: scenario.userBudgetCap,
    exceptionReason: scenario.exceptionReason,
  };
}

describe('createBooking', () => {
  const request = scenarios.green;
  const decision = evaluatePolicy(inputsFromScenario(request), policyRules, NOW);
  const [venueOption] = matchVenues(
    {
      eventType: request.eventType,
      attendeeCount: request.attendeeCount,
      alcoholRequested: request.alcoholRequested,
      budgetPerAttendee: decision.budget.effectivePerAttendee,
    },
    venues
  );

  it('builds a booking carrying the venue, event and policy-decision details', () => {
    const booking = createBooking(request, venueOption, decision, NOW);
    assert.equal(booking.venueId, venueOption.venue.id);
    assert.equal(booking.venueName, venueOption.venue.name);
    assert.equal(booking.eventDate, request.eventDate);
    assert.equal(booking.startTime, request.startTime);
    assert.equal(booking.attendeeCount, request.attendeeCount);
    assert.deepEqual(booking.estimatedPerHead, venueOption.venue.perHeadFrom);
    assert.deepEqual(booking.estimatedTotal, venueOption.estimatedTotal);
    assert.equal(booking.policyDecisionId, decision.id);
    assert.equal(booking.bookedAt, NOW.toISOString());
  });

  it('always marks the booking as simulated', () => {
    const booking = createBooking(request, venueOption, decision, NOW);
    assert.equal(booking.simulated, true);
  });

  it('produces an identical reference for identical inputs', () => {
    const first = createBooking(request, venueOption, decision, NOW);
    const second = createBooking(request, venueOption, decision, NOW);
    assert.equal(first.reference, second.reference);
  });

  it('produces a different reference when the venue differs', () => {
    const otherOption = matchVenues(
      {
        eventType: request.eventType,
        attendeeCount: request.attendeeCount,
        alcoholRequested: request.alcoholRequested,
        budgetPerAttendee: decision.budget.effectivePerAttendee,
      },
      venues
    ).find((option) => option.venue.id !== venueOption.venue.id);

    const first = createBooking(request, venueOption, decision, NOW);
    const second = createBooking(request, otherOption, decision, NOW);
    assert.notEqual(first.reference, second.reference);
  });

  it('produces a different reference when the underlying policy decision differs', () => {
    const otherDecision = evaluatePolicy(inputsFromScenario(scenarios.amber), policyRules, NOW);
    const first = createBooking(request, venueOption, decision, NOW);
    const second = createBooking(request, venueOption, otherDecision, NOW);
    assert.notEqual(first.reference, second.reference);
  });

  it('prefixes the reference with DC-', () => {
    const booking = createBooking(request, venueOption, decision, NOW);
    assert.match(booking.reference, /^DC-[0-9A-F]+$/);
  });
});
