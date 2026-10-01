import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractSlots } from '../src/domain/chat/extractSlots.js';
import { gbp } from '../src/domain/money.js';

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
  };
}

describe('extractSlots', () => {
  it('fills several slots at once from one pasted brief', () => {
    const { filled } = extractSlots(
      emptyDraft(),
      'Client dinner for 6 people on 14 March 2026, I am a Director, budget £80 per head, no alcohol',
      NOW
    );
    const keys = filled.map((f) => f.key);
    assert.ok(keys.includes('audience'));
    assert.ok(keys.includes('eventType'));
    assert.ok(keys.includes('organiserGrade'));
    assert.ok(keys.includes('eventDate'));
    assert.ok(keys.includes('attendeeCount'));
    assert.ok(keys.includes('userBudgetCap'));
    assert.ok(keys.includes('alcoholRequested'));
  });

  it('distinguishes "£40 per head" from "£40 total" using attendee count already on the draft', () => {
    const draft = { ...emptyDraft(), attendeeCount: 4 };
    const { filled } = extractSlots(draft, '£160 total', NOW);
    const budget = filled.find((f) => f.key === 'userBudgetCap');
    assert.deepEqual(budget.value, gbp(40));
  });

  it('does not fill attendeeCount from a bare number with no unit word', () => {
    const { filled } = extractSlots(emptyDraft(), '20', NOW);
    assert.equal(filled.find((f) => f.key === 'attendeeCount'), undefined);
  });

  it('fills attendeeCount when a unit word is present', () => {
    const { filled } = extractSlots(emptyDraft(), '20 guests', NOW);
    const count = filled.find((f) => f.key === 'attendeeCount');
    assert.equal(count.value, 20);
  });

  it('never re-fills a slot that is already set on the draft', () => {
    const draft = { ...emptyDraft(), attendeeCount: 8 };
    const { filled } = extractSlots(draft, '30 guests', NOW);
    assert.equal(filled.find((f) => f.key === 'attendeeCount'), undefined);
  });

  it('treats an explicitly empty attendeeTags array as already filled, not re-extracting it', () => {
    const draft = { ...emptyDraft(), attendeeTags: [] };
    const { filled } = extractSlots(draft, 'the attendees include a public official', NOW);
    assert.equal(filled.find((f) => f.key === 'attendeeTags'), undefined);
  });

  it('parses a long-form date', () => {
    const { filled } = extractSlots(emptyDraft(), 'Let\'s do it on 14 March 2026', NOW);
    const date = filled.find((f) => f.key === 'eventDate');
    assert.equal(date.value, '2026-03-14');
  });

  it('parses a numeric UK-style date', () => {
    const { filled } = extractSlots(emptyDraft(), 'How about 14/03/2026', NOW);
    const date = filled.find((f) => f.key === 'eventDate');
    assert.equal(date.value, '2026-03-14');
  });
});
