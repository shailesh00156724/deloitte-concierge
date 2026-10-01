import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextPrompt } from '../src/domain/chat/nextPrompt.js';

function emptyDraft() {
  return {
    audience: null,
    eventType: null,
    organiserGrade: null,
    eventDate: null,
    attendeeCount: null,
    alcoholRequested: null,
    attendeeTags: null,
    userBudgetCap: null,
  };
}

describe('nextPrompt', () => {
  it('asks for the first mandatory group when the draft is empty', () => {
    const result = nextPrompt(emptyDraft());
    assert.equal(result.done, false);
    assert.deepEqual(result.missingKeys.sort(), ['audience', 'eventType', 'organiserGrade'].sort());
  });

  it('moves on to the next group once the first is filled', () => {
    const draft = { ...emptyDraft(), audience: 'client_social', eventType: 'dinner_and_drinks', organiserGrade: 'partner' };
    const result = nextPrompt(draft);
    assert.deepEqual(result.missingKeys.sort(), ['attendeeCount', 'eventDate'].sort());
  });

  it('reports done once every mandatory slot is filled', () => {
    const draft = {
      audience: 'client_social',
      eventType: 'dinner_and_drinks',
      organiserGrade: 'partner',
      eventDate: '2026-03-14',
      attendeeCount: 6,
      alcoholRequested: false,
      attendeeTags: [],
      userBudgetCap: { amount: 8000, currency: 'GBP' },
    };
    const result = nextPrompt(draft);
    assert.equal(result.done, true);
  });

  it('never re-asks for a slot once it is filled', () => {
    const draft = { ...emptyDraft(), audience: 'client_social' };
    const result = nextPrompt(draft);
    assert.ok(!result.missingKeys.includes('audience'));
  });
});
