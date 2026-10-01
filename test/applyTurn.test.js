import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyTurn } from '../src/domain/chat/applyTurn.js';

const NOW = new Date('2026-10-01T09:00:00.000Z');

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
    purpose: null,
    attendeeGroupLabel: null,
    location: null,
    dietaryNeeds: null,
    cuisineOrActivityPreference: null,
    exceptionReason: null,
  };
}

describe('applyTurn', () => {
  it('fills multiple slots from one utterance and prompts for the next missing group', () => {
    const session = { draft: emptyDraft(), targetSlot: null };
    const result = applyTurn(session, 'Client dinner, I am a Partner', NOW);
    assert.equal(result.draft.audience, 'client_social');
    assert.equal(result.draft.eventType, 'dinner_and_drinks');
    assert.equal(result.draft.organiserGrade, 'partner');
    assert.ok(result.messages.some((m) => m.role === 'assistant'));
  });

  it('routes to the targeted slot and overwrites it when an edit chip set targetSlot', () => {
    const session = { draft: { ...emptyDraft(), organiserGrade: 'director_or_below' }, targetSlot: 'organiserGrade' };
    const result = applyTurn(session, 'Partner', NOW);
    assert.equal(result.draft.organiserGrade, 'partner');
    assert.equal(result.targetSlot, null);
  });

  it('does not overwrite a filled slot from ordinary scanning — only a targeted turn can overwrite', () => {
    const session = { draft: { ...emptyDraft(), organiserGrade: 'partner' }, targetSlot: null };
    const result = applyTurn(session, 'Actually I am a Director', NOW);
    assert.equal(result.draft.organiserGrade, 'partner');
  });

  it('ignores empty or whitespace-only input', () => {
    const session = { draft: emptyDraft(), targetSlot: null };
    const result = applyTurn(session, '   ', NOW);
    assert.deepEqual(result.draft, session.draft);
    assert.deepEqual(result.messages, []);
  });

  it('caps pasted input length at 2000 characters', () => {
    const session = { draft: emptyDraft(), targetSlot: null };
    const longText = 'client dinner '.repeat(300);
    const result = applyTurn(session, longText, NOW);
    assert.ok(result.messages[0].text.length <= 2000);
  });

  it('confirms every slot is filled once the full mandatory set is captured across turns', () => {
    let session = { draft: emptyDraft(), targetSlot: null };
    session = { ...applyTurn(session, 'Client dinner, I am a Partner', NOW), targetSlot: null };
    session = { ...applyTurn(session, 'On 14 March 2026 for 6 guests', NOW), targetSlot: null };
    session = { ...applyTurn(session, 'No alcohol, no restricted attendees', NOW), targetSlot: null };
    session = { ...applyTurn(session, '£120 per head', NOW), targetSlot: null };
    assert.equal(session.draft.audience, 'client_social');
    assert.equal(session.draft.attendeeCount, 6);
    assert.deepEqual(session.draft.attendeeTags, []);
    assert.ok(session.messages.some((m) => m.text.includes('review')));
  });
});
