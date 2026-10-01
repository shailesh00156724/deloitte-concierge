/**
 * applyTurn: the one pure function that turns (session, utterance, now) into
 * a new session. All draft writes go through setSlot so chat and the review
 * panel's inline edits share a single path (and both invalidate any stale
 * policy decision the same way — see main.js).
 */

import { getSlot } from './slots.js';
import { extractSlots } from './extractSlots.js';
import { nextPrompt } from './nextPrompt.js';
import { getPolicySuggestedBudget } from './suggestedBudget.js';
import { gbp, formatMoney } from '../money.js';

// Deliberately excludes a bare "no" — that's a legitimate answer to yes/no
// slots like alcohol, and is disambiguated below by trying extraction first.
const CORRECTION_PATTERN = /^(actually|change|make it|rather|wait|no,? that'?s (wrong|not right))\b/i;

const AFFIRMATION_PATTERN = /^(yes|yeah|yep|yup|confirm(ed)?|sounds good|ok(ay)?|that'?s fine|sure|agreed?|correct)\b/i;

const GRADE_LABEL = { partner: 'Partner', director_or_below: 'Director-and-below' };

/**
 * @param {Object} draft
 * @param {string} key
 * @param {*} value
 * @returns {Object} new draft
 */
export function setSlot(draft, key, value) {
  getSlot(key); // throws on an unknown key
  return { ...draft, [key]: value };
}

/**
 * A bare number (no £ sign, no qualifier word) is ambiguous in open chat —
 * it could be a date or a count — but once the user is specifically being
 * asked to confirm or override a budget figure, that ambiguity is gone, so
 * a bare "150" is accepted here even though the general money parser rejects it.
 */
function parseBudgetAmount(utterance, now, draft, slot) {
  const structured = slot.parse(utterance, now, draft);
  if (structured) return structured;
  const bareNumber = utterance.trim().match(/^£?\s*(\d+(?:\.\d{1,2})?)\s*$/);
  if (bareNumber) return { value: gbp(Number(bareNumber[1])), confidence: 0.8 };
  return null;
}

/**
 * @param {{ draft: Object, targetSlot: string|null }} session
 * @param {string} utterance
 * @param {Date} now
 * @returns {{ draft: Object, targetSlot: string|null, messages: Array<{role: string, text: string}> }}
 */
export function applyTurn(session, utterance, now) {
  const trimmed = utterance.trim().slice(0, 2000);
  if (!trimmed) {
    return { draft: session.draft, targetSlot: session.targetSlot, messages: [] };
  }

  const messages = [{ role: 'user', text: trimmed }];

  // Routed correction: an edit chip set targetSlot, or the utterance opens
  // with a correction phrase — in both cases, overwrite rather than fill-only.
  if (session.targetSlot) {
    const slot = getSlot(session.targetSlot);

    if (session.targetSlot === 'userBudgetCap') {
      return { ...handleBudgetReply(session.draft, trimmed, now, slot, messages), targetSlot: null };
    }

    const result = slot.freeText ? { value: trimmed, confidence: 1 } : slot.parse(trimmed, now, session.draft);

    if (result) {
      const draft = setSlot(session.draft, session.targetSlot, result.value);
      messages.push({ role: 'assistant', text: `Got it — ${slot.format(result.value)}.` });
      return continueWithPrompt(draft, messages);
    }

    messages.push({ role: 'assistant', text: "Sorry, I didn't catch that — could you rephrase it?" });
    return { draft: session.draft, targetSlot: session.targetSlot, messages };
  }

  if (CORRECTION_PATTERN.test(trimmed)) {
    messages.push({
      role: 'assistant',
      text: 'Which detail would you like to change? Use an Edit link in the review panel, or tell me the field directly.',
    });
    return { draft: session.draft, targetSlot: null, messages };
  }

  const { filled } = extractSlots(session.draft, trimmed, now);
  let draft = session.draft;
  for (const { key, value } of filled) {
    draft = setSlot(draft, key, value);
    const slot = getSlot(key);
    messages.push({ role: 'assistant', text: `${slot.format(value)} — noted.` });
  }

  return continueWithPrompt(draft, messages);
}

/**
 * Handles a reply to the "here's the policy-recommended budget — confirm or
 * give a different amount" prompt (see offerSuggestedBudget below). An
 * affirmation accepts the policy figure as-is; otherwise the reply is parsed
 * as an override amount, with a caution message if it exceeds the policy
 * recommendation (per-attendee or the absolute per-event ceiling).
 */
function handleBudgetReply(draft, trimmed, now, slot, messages) {
  const suggestion = getPolicySuggestedBudget(draft);

  if (suggestion && AFFIRMATION_PATTERN.test(trimmed)) {
    const updated = setSlot(draft, 'userBudgetCap', suggestion.effectivePerAttendee);
    messages.push({ role: 'assistant', text: `Confirmed — ${formatMoney(suggestion.effectivePerAttendee)} per person.` });
    return continueWithPrompt(updated, messages);
  }

  const result = parseBudgetAmount(trimmed, now, draft, slot);
  if (!result) {
    messages.push({
      role: 'assistant',
      text: "Sorry, I didn't catch that — reply \"confirm\" to accept the recommended budget, or tell me the amount you'd like per person.",
    });
    return { draft, messages };
  }

  const updated = setSlot(draft, 'userBudgetCap', result.value);
  messages.push({ role: 'assistant', text: `Got it — ${formatMoney(result.value)} per person.` });
  if (suggestion && result.value.amount > suggestion.effectivePerAttendee.amount) {
    messages.push({
      role: 'assistant',
      text: `That's above the policy-recommended ${formatMoney(suggestion.effectivePerAttendee)} per person — please be cautious and obtain approval before proceeding.`,
    });
  }
  return continueWithPrompt(updated, messages);
}

/**
 * Once the mandatory details needed to look up a policy allowance (audience,
 * event type, organiser grade, attendee count) are known and no budget has
 * been entered yet, offers the policy's own recommended per-attendee figure
 * instead of asking an open "what's your budget?" question — the user then
 * confirms it or names a different amount (handleBudgetReply above).
 * Returns null if nothing to offer (no matching policy rule, or the only
 * missing slot isn't budget), in which case the normal nextPrompt flow runs.
 */
function offerSuggestedBudget(draft) {
  if (draft.userBudgetCap !== null) return null;
  const next = nextPrompt(draft);
  if (next.done || next.missingKeys.length !== 1 || next.missingKeys[0] !== 'userBudgetCap') return null;

  const suggestion = getPolicySuggestedBudget(draft);
  if (!suggestion) return null;

  const gradeLabel = GRADE_LABEL[draft.organiserGrade] ?? 'your grade';
  return {
    text: `Based on policy, the recommended budget for ${gradeLabel} is ${formatMoney(suggestion.effectivePerAttendee)} per person. Reply "confirm" to use this, or tell me a different amount.`,
  };
}

function continueWithPrompt(draft, messages) {
  const offer = offerSuggestedBudget(draft);
  if (offer) {
    messages.push({ role: 'assistant', text: offer.text });
    return { draft, messages, targetSlot: 'userBudgetCap' };
  }

  const next = nextPrompt(draft);
  if (!next.done) {
    messages.push({ role: 'assistant', text: next.prompt });
  } else {
    messages.push({ role: 'assistant', text: "That's everything I need — please review the summary below." });
  }
  return { draft, messages, targetSlot: null };
}
