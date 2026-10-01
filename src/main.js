/**
 * The only stateful orchestrator in the app. Owns the session object, wires
 * domain/chat and domain/policy to the UI components, and is the only module
 * that touches both the DOM and a persistence adapter directly.
 */

import { applyTurn, setSlot } from './domain/chat/applyTurn.js';
import { nextPrompt } from './domain/chat/nextPrompt.js';
import { evaluatePolicy } from './domain/policy/evaluatePolicy.js';
import { policyRules } from './domain/seed/policyRules.seed.js';
import { createLocalStoragePersistence } from './adapters/localStoragePersistence.js';
import { createSeedVenueSearch } from './adapters/seedVenueSearch.js';
import { createMockBooking } from './adapters/mockBooking.js';
import { renderChatPanel } from './ui/chatPanel.js';
import { renderReviewPanel } from './ui/reviewPanel.js';
import { renderPolicyResultCard } from './ui/policyResultCard.js';
import { renderVenueOptionsPanel } from './ui/venueOptionsPanel.js';
import { renderBookingConfirmation } from './ui/bookingConfirmation.js';
import { clear } from './ui/render.js';

const persistence = createLocalStoragePersistence();
const venueSearch = createSeedVenueSearch();
const booking = createMockBooking();

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

function initialSession() {
  const greeting = { role: 'assistant', text: "Hello — tell me about the event you'd like to plan, or ask me anything about it." };
  const saved = persistence.loadSession();
  if (saved) {
    return {
      ...saved,
      selectedVenueId: saved.selectedVenueId ?? null,
      booking: saved.booking ?? null,
    };
  }
  const draft = emptyDraft();
  const prompt = nextPrompt(draft);
  return {
    draft,
    targetSlot: null,
    messages: [greeting, ...(prompt.done ? [] : [{ role: 'assistant', text: prompt.prompt }])],
    decision: null,
    decisionInputsHash: null,
    selectedVenueId: null,
    booking: null,
  };
}

let session = initialSession();

function now() {
  return new Date();
}

function save() {
  persistence.saveSession(session);
}

function handleSend(text) {
  const result = applyTurn({ draft: session.draft, targetSlot: session.targetSlot }, text, now());
  session = {
    ...session,
    draft: result.draft,
    targetSlot: result.targetSlot,
    messages: [...session.messages, ...result.messages],
  };
  save();
  render();
}

function handleRestart() {
  persistence.clearSession();
  session = initialSession();
  render();
}

function handleEdit(key) {
  session = {
    ...session,
    targetSlot: key,
    messages: [...session.messages, { role: 'assistant', text: `What should ${key} be?` }],
  };
  save();
  render();
}

function evaluatedInputsFrom(draft) {
  return {
    eventRequestId: 'draft',
    audience: draft.audience,
    eventType: draft.eventType,
    organiserGrade: draft.organiserGrade,
    attendeeCount: draft.attendeeCount,
    attendeeTags: draft.attendeeTags,
    alcoholRequested: draft.alcoholRequested,
    eventDate: draft.eventDate,
    userBudgetCap: draft.userBudgetCap,
    exceptionReason: draft.exceptionReason,
  };
}

/**
 * Evaluates policy against the current draft and, if the inputs have
 * changed since the last stored decision, replaces it. A venue selection or
 * booking made under a now-superseded decision is no longer authorised by
 * anything, so both are cleared alongside it.
 */
function autoEvaluatePolicy() {
  if (!nextPrompt(session.draft).done) return;
  const decision = evaluatePolicy(evaluatedInputsFrom(session.draft), policyRules, now());
  if (decision.inputsHash === session.decisionInputsHash) return;
  session = {
    ...session,
    decision,
    decisionInputsHash: decision.inputsHash,
    selectedVenueId: null,
    booking: null,
  };
  save();
}

function handleSelectVenue(venueId) {
  session = { ...session, selectedVenueId: venueId };
  save();
  render();
}

function handleConfirmBooking() {
  const options = venueSearch.searchVenues({
    eventType: session.draft.eventType,
    attendeeCount: session.draft.attendeeCount,
    alcoholRequested: session.draft.alcoholRequested,
    budgetPerAttendee: session.decision.budget.effectivePerAttendee,
  });
  const selected = options.find((option) => option.venue.id === session.selectedVenueId);
  if (!selected || !selected.withinBudget) return;

  const newBooking = booking.book(
    { ...session.draft, status: 'booked' },
    selected,
    session.decision
  );

  session = {
    ...session,
    booking: newBooking,
    messages: [
      ...session.messages,
      {
        role: 'assistant',
        text: `Booking confirmed (simulated) at ${newBooking.venueName} — reference ${newBooking.reference}.`,
      },
    ],
  };
  save();
  render();
}

function quickRepliesFor() {
  if (session.targetSlot === 'userBudgetCap') return ['Confirm'];
  if (session.targetSlot) return [];
  const prompt = nextPrompt(session.draft);
  if (prompt.done) return [];
  if (prompt.missingKeys.includes('audience')) return ['Client', 'Deloitte project team', 'Deloitte leadership'];
  if (prompt.missingKeys.includes('alcoholRequested')) return ['No alcohol, no restricted attendees', 'Yes, alcohol will be served'];
  return [];
}

function render() {
  autoEvaluatePolicy();

  const main = document.getElementById('app-main');
  clear(main);

  main.appendChild(
    renderChatPanel({
      messages: session.messages,
      quickReplies: quickRepliesFor(),
      onSend: handleSend,
      onQuickReply: handleSend,
      onRestart: handleRestart,
    })
  );

  const ready = nextPrompt(session.draft).done;
  if (ready) {
    main.appendChild(
      renderReviewPanel({
        draft: session.draft,
        onEdit: handleEdit,
      })
    );
  }

  if (session.decision) {
    main.appendChild(renderPolicyResultCard(session.decision));
  }

  if (session.decision && session.decision.canProceed && !session.booking) {
    const options = venueSearch.searchVenues({
      eventType: session.draft.eventType,
      attendeeCount: session.draft.attendeeCount,
      alcoholRequested: session.draft.alcoholRequested,
      budgetPerAttendee: session.decision.budget.effectivePerAttendee,
    });
    main.appendChild(
      renderVenueOptionsPanel({
        options,
        selectedVenueId: session.selectedVenueId,
        budgetPerAttendee: session.decision.budget.effectivePerAttendee,
        onSelect: handleSelectVenue,
        onConfirm: handleConfirmBooking,
      })
    );
  }

  if (session.booking) {
    main.appendChild(renderBookingConfirmation({ booking: session.booking, onRestart: handleRestart }));
  }
}

render();
