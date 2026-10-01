import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget } from '../src/domain/policy/calculateBudget.js';
import { gbp } from '../src/domain/money.js';

/** @type {import('../src/domain/types.js').PolicyRule} */
function ruleWithSpend({ perAttendee, amberBandTo, overallEventCap }) {
  return {
    id: 'test-rule',
    version: '1.0',
    ruleSetVersion: 'test',
    audience: 'deloitte_project_team',
    eventTypes: 'all',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    specificity: 10,
    controls: [
      { kind: 'spend_threshold', id: 'spend', label: 'spend', perAttendee, amberBandTo, overallEventCap },
    ],
    sourceLabel: 'SAMPLE — not official Deloitte policy',
  };
}

describe('calculateBudget', () => {
  it('uses the policy allowance when the user cap exactly equals it, attributing the tie to the policy', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(45) });
    const result = calculateBudget({ attendeeCount: 10, userBudgetCap: gbp(45) }, rule);
    assert.equal(result.bindingConstraint, 'policy_per_attendee');
    assert.deepEqual(result.effectivePerAttendee, gbp(45));
    assert.deepEqual(result.effectiveTotalBudget, gbp(450));
  });

  it('binds to the policy allowance when the user cap is one penny above it', () => {
    const rule = ruleWithSpend({ perAttendee: { amount: 4500, currency: 'GBP' } });
    const result = calculateBudget(
      { attendeeCount: 10, userBudgetCap: { amount: 4501, currency: 'GBP' } },
      rule
    );
    assert.equal(result.bindingConstraint, 'policy_per_attendee');
    assert.equal(result.effectivePerAttendee.amount, 4500);
  });

  it('binds to the user cap when it is one penny below the policy allowance', () => {
    const rule = ruleWithSpend({ perAttendee: { amount: 4500, currency: 'GBP' } });
    const result = calculateBudget(
      { attendeeCount: 10, userBudgetCap: { amount: 4499, currency: 'GBP' } },
      rule
    );
    assert.equal(result.bindingConstraint, 'user_cap');
    assert.equal(result.effectivePerAttendee.amount, 4499);
  });

  it('still clamps to the lower policy allowance even when the user cap is above the amber band, leaving amber evaluation to the policy engine', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(45), amberBandTo: gbp(65) });
    const result = calculateBudget({ attendeeCount: 5, userBudgetCap: gbp(90) }, rule);
    assert.equal(result.bindingConstraint, 'policy_per_attendee');
    assert.deepEqual(result.effectivePerAttendee, gbp(45));
  });

  it('lets an overall event cap override a higher per-attendee total, flooring the derived per-attendee figure', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(75), overallEventCap: gbp(5000) });
    const result = calculateBudget({ attendeeCount: 80, userBudgetCap: null }, rule);
    assert.equal(result.bindingConstraint, 'policy_event_cap');
    assert.deepEqual(result.effectiveTotalBudget, gbp(5000));
    // 500000 / 80 = 6250 pence exactly, no flooring needed here
    assert.equal(result.effectivePerAttendee.amount, 6250);
  });

  it('floors the derived per-attendee figure when the event cap does not divide evenly by attendee count', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(75), overallEventCap: gbp(5000) });
    const result = calculateBudget({ attendeeCount: 77, userBudgetCap: null }, rule);
    assert.equal(result.bindingConstraint, 'policy_event_cap');
    // 500000 / 77 = 6493.5...  must floor, not round
    assert.equal(result.effectivePerAttendee.amount, 6493);
  });

  it('does not let the event cap override when the per-attendee total is already lower', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(45), overallEventCap: gbp(5000) });
    const result = calculateBudget({ attendeeCount: 8, userBudgetCap: null }, rule);
    assert.equal(result.bindingConstraint, 'policy_per_attendee');
    assert.deepEqual(result.effectiveTotalBudget, gbp(360));
  });

  it('produces a zero total for zero attendees without dividing by zero', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(45) });
    const result = calculateBudget({ attendeeCount: 0, userBudgetCap: null }, rule);
    assert.equal(result.effectiveTotalBudget.amount, 0);
  });

  it('computes a single-attendee budget correctly', () => {
    const rule = ruleWithSpend({ perAttendee: gbp(45) });
    const result = calculateBudget({ attendeeCount: 1, userBudgetCap: null }, rule);
    assert.deepEqual(result.effectiveTotalBudget, gbp(45));
  });

  it('returns nulls throughout when there is no matched rule and no user cap', () => {
    const result = calculateBudget({ attendeeCount: 10, userBudgetCap: null }, null);
    assert.equal(result.policyAllowancePerAttendee, null);
    assert.equal(result.effectiveTotalBudget, null);
    assert.equal(result.bindingConstraint, 'none');
  });

  it('falls back to the user cap alone when there is no matched rule', () => {
    const result = calculateBudget({ attendeeCount: 4, userBudgetCap: gbp(50) }, null);
    assert.equal(result.bindingConstraint, 'user_cap');
    assert.deepEqual(result.effectiveTotalBudget, gbp(200));
  });
});
