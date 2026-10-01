import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchRules } from '../src/domain/policy/matchRules.js';
import { policyRules } from '../src/domain/seed/policyRules.seed.js';

describe('matchRules', () => {
  it('matches the sample project-team rule for internal project team events, since the real policy only covers client entertainment', () => {
    const result = matchRules(
      { audience: 'deloitte_project_team', eventType: 'dinner_and_drinks', eventDate: '2026-06-01' },
      policyRules
    );
    assert.equal(result[0]?.id, 'project-team-standard');
  });

  it('matches the sample leadership rule for leadership events', () => {
    const result = matchRules(
      { audience: 'deloitte_leadership', eventType: 'dinner_and_drinks', eventDate: '2026-06-01' },
      policyRules
    );
    assert.equal(result[0]?.id, 'leadership-standard');
  });

  it('matches the client social rule only for its listed event types', () => {
    const matched = matchRules(
      { audience: 'client_social', eventType: 'drinks_and_nibbles', eventDate: '2026-06-01' },
      policyRules
    );
    assert.equal(matched[0]?.id, 'client-social-standard');

    const unmatched = matchRules(
      { audience: 'client_social', eventType: 'large_event', eventDate: '2026-06-01' },
      policyRules
    );
    assert.equal(unmatched.length, 0);
  });

  it('excludes a rule whose effective window has not yet started', () => {
    const rules = [
      {
        ...policyRules[0],
        id: 'future-rule',
        effectiveFrom: '2099-01-01',
        effectiveTo: null,
      },
    ];
    const result = matchRules(
      { audience: 'client_social', eventType: 'dinner_and_drinks', eventDate: '2026-06-01' },
      rules
    );
    assert.equal(result.length, 0);
  });

  it('excludes a rule whose effective window has already ended, evaluated against the event date', () => {
    const rules = [
      {
        ...policyRules[0],
        id: 'expired-rule',
        effectiveFrom: '2020-01-01',
        effectiveTo: '2021-01-01',
      },
    ];
    const result = matchRules(
      { audience: 'client_social', eventType: 'dinner_and_drinks', eventDate: '2026-06-01' },
      rules
    );
    assert.equal(result.length, 0);
  });

  it('is invariant to the order rules are supplied in', () => {
    const inputs = { audience: 'client_social', eventType: 'dinner_and_drinks', eventDate: '2026-06-01' };
    const forward = matchRules(inputs, policyRules);
    const reversed = matchRules(inputs, policyRules.slice().reverse());
    assert.deepEqual(forward, reversed);
  });

  it('returns no candidates when audience is missing, treating it as insufficient data rather than a mismatch', () => {
    const result = matchRules(
      { audience: null, eventType: 'dinner_and_drinks', eventDate: '2026-06-01' },
      policyRules
    );
    assert.equal(result.length, 0);
  });
});
