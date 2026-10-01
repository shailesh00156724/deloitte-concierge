import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchVenues } from '../src/domain/venue/matchVenues.js';
import { venues } from '../src/domain/seed/venues.seed.js';
import { gbp } from '../src/domain/money.js';

describe('matchVenues', () => {
  it('excludes venues whose capacity is below the attendee count', () => {
    const result = matchVenues(
      { eventType: 'activity_plus_meal', attendeeCount: 50, alcoholRequested: false, budgetPerAttendee: null },
      venues
    );
    assert.ok(result.every((option) => option.venue.maxCapacity >= 50));
    assert.ok(!result.some((option) => option.venue.id === 'the-strike-and-slice'));
  });

  it('excludes venues that do not support the requested event type', () => {
    const result = matchVenues(
      { eventType: 'activity_plus_meal', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: null },
      venues
    );
    assert.ok(!result.some((option) => option.venue.id === 'the-oakwood-tavern'));
  });

  it('excludes venues that do not serve alcohol when alcohol was requested', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: true, budgetPerAttendee: null },
      venues
    );
    assert.ok(!result.some((option) => option.venue.id === 'harrow-lane-bistro'));
  });

  it('includes a venue that does not serve alcohol when alcohol was not requested', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: null },
      venues
    );
    assert.ok(result.some((option) => option.venue.id === 'harrow-lane-bistro'));
  });

  it('computes estimatedTotal as perHeadFrom times attendeeCount', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: null },
      venues
    );
    const oakwood = result.find((option) => option.venue.id === 'the-oakwood-tavern');
    assert.deepEqual(oakwood.estimatedTotal, gbp(320));
  });

  it('flags a venue as within budget when its per-head price is at or below the budget', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: gbp(45) },
      venues
    );
    const spindle = result.find((option) => option.venue.id === 'spindle-and-sage');
    assert.equal(spindle.withinBudget, true);
    assert.equal(spindle.overBudgetBy, null);
  });

  it('flags a venue as over budget and states the overage when its per-head price exceeds the budget', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: gbp(45) },
      venues
    );
    const glasshouse = result.find((option) => option.venue.id === 'the-glasshouse-rooftop');
    assert.equal(glasshouse.withinBudget, false);
    assert.deepEqual(glasshouse.overBudgetBy, gbp(20));
  });

  it('treats a null budget as unconstrained, so every venue is within budget', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: null },
      venues
    );
    assert.ok(result.every((option) => option.withinBudget === true));
  });

  it('ranks within-budget venues before over-budget venues regardless of rating or price', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: gbp(45) },
      venues
    );
    const firstOverBudgetIndex = result.findIndex((option) => !option.withinBudget);
    const lastWithinBudgetIndex = result.map((o) => o.withinBudget).lastIndexOf(true);
    assert.ok(firstOverBudgetIndex === -1 || firstOverBudgetIndex > lastWithinBudgetIndex);
  });

  it('is invariant to the order venues are supplied in', () => {
    const criteria = { eventType: 'dinner_and_drinks', attendeeCount: 10, alcoholRequested: false, budgetPerAttendee: gbp(45) };
    const forward = matchVenues(criteria, venues);
    const reversed = matchVenues(criteria, venues.slice().reverse());
    assert.deepEqual(forward, reversed);
  });

  it('returns no candidates when no venue meets the filter criteria', () => {
    const result = matchVenues(
      { eventType: 'dinner_and_drinks', attendeeCount: 1000, alcoholRequested: false, budgetPerAttendee: null },
      venues
    );
    assert.equal(result.length, 0);
  });
});
