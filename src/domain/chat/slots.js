/**
 * The slot registry: the single source of truth for what the chat needs to
 * capture, in what order, and how to parse it. Both the chat flow and the
 * review panel read this same registry so there is only one path for writing
 * a value into the draft (see setSlot in applyTurn.js).
 *
 * Structured slots (`freeText: false`) are scanned on every utterance by
 * extractSlots.js, so a single pasted brief can fill several at once.
 * Free-text slots (`freeText: true`) are only ever filled when they are the
 * active `targetSlot` — scanning free text globally would make almost any
 * message "match" almost any free-text field.
 *
 * `group` controls the order mandatory slots are asked in; slots sharing a
 * group number are asked together in one prompt.
 */

import { gbp, formatMoney } from '../money.js';

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/** @param {string} utterance @param {Date} now @returns {{value: string, confidence: number}|null} */
function parseUkDate(utterance, now) {
  const text = utterance.toLowerCase();

  if (/\btoday\b/.test(text)) return { value: toISODate(now), confidence: 0.9 };
  if (/\btomorrow\b/.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { value: toISODate(d), confidence: 0.9 };
  }

  const nextWeekday = text.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextWeekday) {
    const target = WEEKDAYS.indexOf(nextWeekday[1]);
    const d = new Date(now);
    let add = (target - d.getDay() + 7) % 7;
    add = add === 0 ? 7 : add;
    d.setDate(d.getDate() + add);
    return { value: toISODate(d), confidence: 0.85 };
  }

  const longForm = text.match(
    /\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?\b/
  );
  if (longForm) {
    const day = Number(longForm[1]);
    const month = MONTHS[longForm[2]];
    const year = longForm[3] ? Number(longForm[3]) : now.getFullYear();
    const d = new Date(Date.UTC(year, month, day));
    return { value: toISODate(d), confidence: 0.9 };
  }

  const longFormReversed = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/
  );
  if (longFormReversed) {
    const month = MONTHS[longFormReversed[1]];
    const day = Number(longFormReversed[2]);
    const year = longFormReversed[3] ? Number(longFormReversed[3]) : now.getFullYear();
    const d = new Date(Date.UTC(year, month, day));
    return { value: toISODate(d), confidence: 0.9 };
  }

  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    let year = numeric[3] ? Number(numeric[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day));
    return { value: toISODate(d), confidence: 0.75 };
  }

  return null;
}

/**
 * Only ever matches when a money signal is present (a £ sign, or a
 * per-head/total qualifier) — a bare number must never be read as money,
 * since the same utterance often contains unrelated numbers (dates, counts).
 * @param {string} utterance @returns {{value: import('../types.js').Money, confidence: number}|null}
 */
function parseMoneyPerAttendee(utterance, _now, draft) {
  const match = utterance.match(
    /£\s*(\d+(?:\.\d{1,2})?)\s*(pp|per\s*head|per\s*person|per\s*attendee|each|total|all\s*in)?|(\d+(?:\.\d{1,2})?)\s*(pp|per\s*head|per\s*person|per\s*attendee|each|total|all\s*in)\b/i
  );
  if (!match) return null;
  const amount = Number(match[1] ?? match[3]);
  const qualifier = (match[2] ?? match[4] ?? '').toLowerCase();
  const isTotal = qualifier === 'total' || qualifier === 'all in';

  if (isTotal && draft?.attendeeCount) {
    return { value: gbp(amount / draft.attendeeCount), confidence: 0.75 };
  }
  return { value: gbp(amount), confidence: qualifier ? 0.9 : 0.75 };
}

/** @type {Array<{key: string, mandatory: boolean, freeText: boolean, group: number|null, prompt: string, parse: Function, format: Function, validate: Function}>} */
export const SLOTS = [
  {
    key: 'audience',
    mandatory: true,
    freeText: false,
    group: 1,
    prompt: 'Who is this for — your Deloitte project team, Deloitte leadership, or a client?',
    parse(utterance) {
      const text = utterance.toLowerCase();
      if (/\bclient\b/.test(text)) return { value: 'client_social', confidence: 0.8 };
      if (/\bleadership\b|\bpartners?\s+(meeting|dinner|event)\b/.test(text)) {
        return { value: 'deloitte_leadership', confidence: 0.8 };
      }
      if (/\bproject team\b|\binternal team\b|\bteam dinner\b|\bour team\b|\bmy team\b|\bteam of\b|\bwith (the |my )?team\b/.test(text)) {
        return { value: 'deloitte_project_team', confidence: 0.8 };
      }
      return null;
    },
    format: (value) => ({ deloitte_project_team: 'Deloitte project team', deloitte_leadership: 'Deloitte leadership', client_social: 'Client' }[value] ?? value),
    validate: (value) => (value ? null : 'Audience is required.'),
  },
  {
    key: 'eventType',
    mandatory: true,
    freeText: false,
    group: 1,
    prompt: 'What kind of event is it — e.g. dinner and drinks, drinks and nibbles, an activity, or a larger event?',
    parse(utterance) {
      const text = utterance.toLowerCase();
      if (/\bdinner and drinks\b|\bdinner\b/.test(text)) return { value: 'dinner_and_drinks', confidence: 0.8 };
      if (/\bdrinks and nibbles\b|\bnibbles\b|\bcanap/.test(text)) return { value: 'drinks_and_nibbles', confidence: 0.8 };
      if (/\bactivit(y|ies|iy)\b|\bescape room\b|\bbowling\b|\bgolf\b|\bfun\s+(evening|event|night)\b/.test(text)) return { value: 'activity_plus_meal', confidence: 0.8 };
      if (/\bconference\b|\blarge event\b|\boffsite\b/.test(text)) return { value: 'large_event', confidence: 0.8 };
      if (/\bdrinks\b/.test(text)) return { value: 'drinks_and_nibbles', confidence: 0.5 };
      return null;
    },
    format: (value) => ({
      dinner_and_drinks: 'Dinner and drinks',
      drinks_and_nibbles: 'Drinks and nibbles',
      activity_plus_meal: 'Activity plus meal',
      large_event: 'Large event',
    }[value] ?? value),
    validate: (value) => (value ? null : 'Event type is required.'),
  },
  {
    key: 'organiserGrade',
    mandatory: true,
    freeText: false,
    group: 1,
    prompt: "What's your own grade — Partner, or Director and below?",
    parse(utterance) {
      const text = utterance.toLowerCase();
      if (/\bpartner\b/.test(text)) return { value: 'partner', confidence: 0.8 };
      if (/\bdirector\b|\bsenior manager\b|\bmanager\b|\bconsultant\b|\bassociate\b/.test(text)) {
        return { value: 'director_or_below', confidence: 0.8 };
      }
      return null;
    },
    format: (value) => ({ partner: 'Partner', director_or_below: 'Director-and-below' }[value] ?? value),
    validate: (value) => (value ? null : "Organiser's grade is required."),
  },
  {
    key: 'eventDate',
    mandatory: true,
    freeText: false,
    group: 2,
    prompt: 'When is it?',
    parse: parseUkDate,
    format(value) {
      const d = new Date(`${value}T00:00:00Z`);
      return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    },
    validate: (value) => (value ? null : 'Event date is required.'),
  },
  {
    key: 'attendeeCount',
    mandatory: true,
    freeText: false,
    group: 2,
    prompt: 'Roughly how many people will attend?',
    parse(utterance) {
      const match = utterance.match(/\b(\d{1,4})\s*(?:(people|guests|attendees|pax|persons?|of us)\b|(?=\s+(?:will|are)\s+(?:attend|coming|joining)))/i);
      if (!match) return null;
      return { value: Number(match[1]), confidence: 0.9 };
    },
    format: (value) => String(value),
    validate: (value) => (typeof value === 'number' && value > 0 ? null : 'Attendee count is required.'),
  },
  {
    key: 'alcoholRequested',
    mandatory: true,
    freeText: false,
    group: 3,
    prompt: 'Will alcohol be served?',
    parse(utterance) {
      const text = utterance.toLowerCase();
      if (/\bno alcohol\b|\bnon-alcoholic\b|\bwithout alcohol\b/.test(text)) return { value: false, confidence: 0.85 };
      if (/\balcohol\b|\bwine\b|\bbeer\b/.test(text)) return { value: true, confidence: 0.75 };
      if (/^no\b|\bnone\b/.test(text)) return { value: false, confidence: 0.6 };
      return null;
    },
    format: (value) => (value ? 'Yes' : 'No'),
    validate: (value) => (value === null || value === undefined ? 'Please confirm whether alcohol will be served.' : null),
  },
  {
    key: 'attendeeTags',
    mandatory: true,
    freeText: false,
    group: 3,
    prompt:
      'Are any attendees public officials, from a restricted entity, or linked to an ongoing Deloitte audit of their organisation? (say "no" if not)',
    parse(utterance) {
      const text = utterance.toLowerCase();
      const tags = [];
      if (/\bpublic official\b|\bgovernment official\b|\bregulator\b|\bcivil servant\b/.test(text)) tags.push('public_official');
      if (/\baudit\b/.test(text)) tags.push('audit_target');
      if (/\brestricted entit/.test(text)) tags.push('restricted_entity');
      if (tags.length > 0) return { value: tags, confidence: 0.85 };
      if (/\bnone\b|\bno\b/.test(text)) return { value: [], confidence: 0.6 };
      return null;
    },
    format: (value) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : 'None identified'),
    validate: (value) => (Array.isArray(value) ? null : 'Please confirm attendee details.'),
  },
  {
    // Rather than asking an open question, applyTurn.js computes a suggested
    // per-attendee figure from the matched policy's organiser-grade allowance
    // once groups 1-3 are complete, and presents it for the user to confirm
    // or override (see buildBudgetPrompt/handleBudgetReply in applyTurn.js).
    // This static prompt is only a fallback for when no policy rule matches
    // at all, so no suggestion can be computed.
    key: 'userBudgetCap',
    mandatory: true,
    freeText: false,
    group: 4,
    prompt: "No policy allowance could be calculated automatically — what would you like the budget per person to be?",
    parse: parseMoneyPerAttendee,
    format: formatMoney,
    validate: (value) => (value ? null : 'A budget per person is required to check against policy.'),
  },
  {
    key: 'purpose',
    mandatory: false,
    freeText: true,
    group: null,
    prompt: "What's the event for?",
    parse: (utterance) => ({ value: utterance.trim().slice(0, 500), confidence: 1 }),
    format: (value) => value,
    validate: () => null,
  },
  {
    key: 'attendeeGroupLabel',
    mandatory: false,
    freeText: true,
    group: null,
    prompt: 'Who are the attendees, in a few words (e.g. "RetailCo stakeholders")?',
    parse: (utterance) => ({ value: utterance.trim().slice(0, 200), confidence: 1 }),
    format: (value) => value,
    validate: () => null,
  },
  {
    key: 'location',
    mandatory: false,
    freeText: true,
    group: null,
    prompt: 'Any preferred location or area?',
    parse: (utterance) => ({ value: utterance.trim().slice(0, 200), confidence: 1 }),
    format: (value) => value,
    validate: () => null,
  },
  {
    key: 'dietaryNeeds',
    mandatory: false,
    freeText: true,
    group: null,
    prompt: 'Any dietary needs to flag?',
    parse: (utterance) => ({ value: utterance.trim().slice(0, 300), confidence: 1 }),
    format: (value) => value,
    validate: () => null,
  },
  {
    key: 'cuisineOrActivityPreference',
    mandatory: false,
    freeText: true,
    group: null,
    prompt: 'Any cuisine or activity preference?',
    parse: (utterance) => ({ value: utterance.trim().slice(0, 200), confidence: 1 }),
    format: (value) => value,
    validate: () => null,
  },
  {
    key: 'exceptionReason',
    mandatory: false,
    freeText: true,
    group: null,
    prompt: 'What is the reason for requesting an exception to the standard threshold?',
    parse: (utterance) => ({ value: utterance.trim().slice(0, 500), confidence: 1 }),
    format: (value) => value,
    validate: () => null,
  },
];

export function getSlot(key) {
  const slot = SLOTS.find((s) => s.key === key);
  if (!slot) throw new Error(`Unknown slot: ${key}`);
  return slot;
}

/** Mandatory groups in ask order, e.g. [[audience, eventType, organiserGrade], [eventDate, attendeeCount], ...] */
export const MANDATORY_GROUPS = (() => {
  const mandatorySlots = SLOTS.filter((s) => s.mandatory);
  const groupNumbers = [...new Set(mandatorySlots.map((s) => s.group))].sort((a, b) => a - b);
  return groupNumbers.map((groupNumber) => mandatorySlots.filter((s) => s.group === groupNumber));
})();
