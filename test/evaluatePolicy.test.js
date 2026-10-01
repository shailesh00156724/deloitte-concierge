import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy } from '../src/domain/policy/evaluatePolicy.js';
import { policyRules } from '../src/domain/seed/policyRules.seed.js';
import { scenarios } from '../src/domain/seed/scenarios.seed.js';
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

describe('evaluatePolicy', () => {
  it('returns green for the seeded green scenario: client social spend within the Director-and-below threshold', () => {
    const decision = evaluatePolicy(inputsFromScenario(scenarios.green), policyRules, NOW);
    assert.equal(decision.outcome, 'green');
    assert.equal(decision.canProceed, true);
    assert.equal(decision.matchedRuleId, 'client-social-standard');
    assert.equal(decision.matchedRuleVersion, '1.0');
  });

  it('returns amber for the seeded amber scenario: spend above the Director-and-below threshold needs MySupport pre-approval', () => {
    const decision = evaluatePolicy(inputsFromScenario(scenarios.amber), policyRules, NOW);
    assert.equal(decision.outcome, 'amber');
    assert.equal(decision.canProceed, false);
    assert.ok(decision.reasons.some((r) => r.includes('MySupport')));
    assert.ok(decision.requiredApprovals.length > 0);
  });

  it('returns red for the seeded red scenario: an audit-target attendee is an absolute block regardless of spend', () => {
    const decision = evaluatePolicy(inputsFromScenario(scenarios.red), policyRules, NOW);
    assert.equal(decision.outcome, 'red');
    assert.equal(decision.canProceed, false);
    assert.ok(decision.reasons.some((r) => r.includes('audit_target')));
  });

  it('returns unknown for the seeded unknown scenario: large_event is not a covered event type for client social under the real policy', () => {
    const decision = evaluatePolicy(inputsFromScenario(scenarios.unknown), policyRules, NOW);
    assert.equal(decision.outcome, 'unknown');
    assert.equal(decision.canProceed, false);
    assert.equal(decision.matchedRuleId, null);
  });

  it('is invariant to shuffling the rule set and each rule\'s control array', () => {
    const shuffledRules = policyRules
      .slice()
      .reverse()
      .map((rule) => ({ ...rule, controls: rule.controls.slice().reverse() }));

    for (const scenario of Object.values(scenarios)) {
      const original = evaluatePolicy(inputsFromScenario(scenario), policyRules, NOW);
      const shuffled = evaluatePolicy(inputsFromScenario(scenario), shuffledRules, NOW);
      assert.deepEqual(shuffled, original, `scenario ${scenario.id} diverged under shuffling`);
    }
  });

  it('produces an identical decision when evaluated twice with the same inputs and clock', () => {
    const inputs = inputsFromScenario(scenarios.green);
    const first = evaluatePolicy(inputs, policyRules, NOW);
    const second = evaluatePolicy(inputs, policyRules, NOW);
    assert.deepEqual(first, second);
  });

  it('treats a missing attendee count as unknown rather than red', () => {
    const inputs = { ...inputsFromScenario(scenarios.green), attendeeCount: null };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.outcome, 'unknown');
  });

  it('treats missing attendee tags as unknown rather than red', () => {
    const inputs = { ...inputsFromScenario(scenarios.red), attendeeTags: null };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    const attendeeClassFinding = decision.findings.find((f) => f.controlKind === 'attendee_class');
    assert.equal(attendeeClassFinding.outcome, 'unknown');
    const taggedCapFinding = decision.findings.find((f) => f.controlKind === 'tagged_spend_cap');
    assert.equal(taggedCapFinding.outcome, 'unknown');
  });

  it('treats a missing organiser grade as unknown rather than red or green', () => {
    const inputs = { ...inputsFromScenario(scenarios.green), organiserGrade: null };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    const gradedFinding = decision.findings.find((f) => f.controlKind === 'graded_spend_threshold');
    assert.equal(gradedFinding.outcome, 'unknown');
    assert.equal(decision.outcome, 'unknown');
  });

  it('ranks red above unknown when both occur: a red finding plus a missing-data finding overall resolves to red', () => {
    const inputs = { ...inputsFromScenario(scenarios.red), attendeeCount: null };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.outcome, 'red');
    assert.equal(decision.canProceed, false);
  });

  it('blocks proceeding on amber, requiring explicit pre-approval first', () => {
    const decision = evaluatePolicy(inputsFromScenario(scenarios.amber), policyRules, NOW);
    assert.equal(decision.canProceed, false);
    assert.equal(decision.outcome, 'amber');
  });

  it('shows both per-person and total budget figures on a green decision', () => {
    const decision = evaluatePolicy(inputsFromScenario(scenarios.green), policyRules, NOW);
    assert.ok(decision.budget.effectivePerAttendee);
    assert.ok(decision.budget.effectiveTotalBudget);
    assert.equal(decision.budget.effectiveTotalBudget.amount, decision.budget.effectivePerAttendee.amount * 6);
  });

  it('uses the lower of the user cap and the organiser-grade threshold for the effective budget', () => {
    const inputs = { ...inputsFromScenario(scenarios.green), userBudgetCap: gbp(20) };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.budget.bindingConstraint, 'user_cap');
    assert.deepEqual(decision.budget.effectivePerAttendee, gbp(20));
  });

  it('applies the Partner threshold instead of the Director-and-below threshold when the organiser is a Partner', () => {
    const inputs = { ...inputsFromScenario(scenarios.green), organiserGrade: 'partner', userBudgetCap: gbp(120) };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.outcome, 'green');
  });

  it('red-blocks a restricted-entity/Public Official attendee above the £150 cap that applies regardless of organiser grade', () => {
    const inputs = {
      ...inputsFromScenario(scenarios.green),
      organiserGrade: 'partner',
      attendeeTags: ['public_official'],
      userBudgetCap: gbp(160),
    };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.outcome, 'red');
    const cappedFinding = decision.findings.find((f) => f.controlKind === 'tagged_spend_cap');
    assert.equal(cappedFinding.outcome, 'red');
  });

  it('does not let the restricted-entity cap tighten a spend that is already within it', () => {
    const inputs = {
      ...inputsFromScenario(scenarios.green),
      attendeeTags: ['public_official'],
      userBudgetCap: gbp(90),
    };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    const cappedFinding = decision.findings.find((f) => f.controlKind === 'tagged_spend_cap');
    assert.equal(cappedFinding.outcome, 'green');
  });

  it('red-blocks spend above the £1,500 per-head absolute ceiling regardless of organiser grade', () => {
    const inputs = { ...inputsFromScenario(scenarios.green), organiserGrade: 'partner', userBudgetCap: gbp(1600) };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.outcome, 'red');
  });

  it('red-blocks total spend above the £5,000 per-event absolute ceiling regardless of organiser grade', () => {
    const inputs = {
      ...inputsFromScenario(scenarios.green),
      organiserGrade: 'partner',
      attendeeCount: 40,
      userBudgetCap: gbp(140),
    };
    const decision = evaluatePolicy(inputs, policyRules, NOW);
    assert.equal(decision.outcome, 'red');
  });

  it('cites the real policy document as the source for the client social rule, not sample data', () => {
    const clientSocialRule = policyRules.find((rule) => rule.id === 'client-social-standard');
    assert.ok(clientSocialRule.sourceLabel.includes('Deloitte UK/Switzerland Entertainment'));
  });
});
