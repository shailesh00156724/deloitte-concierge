/**
 * The deterministic policy engine. Pure function: same rules + same inputs +
 * same clock always produce the same PolicyDecision (PRD §14 acceptance
 * criterion). No DOM, no I/O, no implicit Date.now() — `now` is always passed in.
 */

import { matchRules } from './matchRules.js';
import { calculateBudget } from './calculateBudget.js';
import { OUTCOME_HEADLINES, explain } from './explain.js';
import { formatMoney } from '../money.js';
import { hashValue } from '../hash.js';

/** Fixed evaluation order — NOT the order controls happen to appear in a rule's
 * array — so a shuffled rule definition produces an identical decision. */
const CONTROL_EVALUATION_ORDER = [
  'spend_threshold',
  'graded_spend_threshold',
  'tagged_spend_cap',
  'alcohol',
  'attendee_class',
  'event_size_limit',
  'approval',
  'evidence',
  'exception_reason',
];

const OUTCOME_DETERMINING_KINDS = new Set([
  'spend_threshold',
  'graded_spend_threshold',
  'tagged_spend_cap',
  'alcohol',
  'attendee_class',
  'event_size_limit',
]);

const OUTCOME_RANK = { green: 0, amber: 1, unknown: 2, red: 3 };

function worstOutcome(outcomes) {
  return outcomes.reduce((worst, outcome) => (OUTCOME_RANK[outcome] > OUTCOME_RANK[worst] ? outcome : worst), 'green');
}

function evaluateSpendThreshold(control, inputs) {
  const userCap = inputs.userBudgetCap;

  if (!userCap) {
    return {
      outcome: 'green',
      message: `No budget cap was entered; the sample allowance of ${formatMoney(control.perAttendee)} per person applies (${control.label}).`,
      limit: formatMoney(control.perAttendee),
    };
  }

  if (userCap.amount <= control.perAttendee.amount) {
    return {
      outcome: 'green',
      message: `Requested budget of ${formatMoney(userCap)} per person is within the sample allowance of ${formatMoney(control.perAttendee)} (${control.label}).`,
      observed: formatMoney(userCap),
      limit: formatMoney(control.perAttendee),
    };
  }

  if (control.amberBandTo && userCap.amount <= control.amberBandTo.amount) {
    return {
      outcome: 'amber',
      message: `Requested budget of ${formatMoney(userCap)} per person exceeds the sample allowance of ${formatMoney(control.perAttendee)} but is within the exception band up to ${formatMoney(control.amberBandTo)} (${control.label}). Approval required.`,
      observed: formatMoney(userCap),
      limit: formatMoney(control.amberBandTo),
    };
  }

  const limit = control.amberBandTo ?? control.perAttendee;
  return {
    outcome: 'red',
    message: `Requested budget of ${formatMoney(userCap)} per person exceeds the maximum permitted under ${control.label} (${formatMoney(limit)}).`,
    observed: formatMoney(userCap),
    limit: formatMoney(limit),
  };
}

const GRADE_LABEL = { partner: 'Partner', director_or_below: 'Director-and-below' };

function evaluateGradedSpendThreshold(control, inputs) {
  const { organiserGrade, userBudgetCap: userCap, attendeeCount } = inputs;

  if (!organiserGrade) {
    return {
      outcome: 'unknown',
      message: `The organiser's grade has not been confirmed, so ${control.label} cannot be checked.`,
    };
  }

  if (attendeeCount === null) {
    return {
      outcome: 'unknown',
      message: `Attendee count has not been confirmed, so total spend against the ${formatMoney(control.absoluteCeilingTotalEvent)} event ceiling under ${control.label} cannot be checked.`,
    };
  }

  const threshold = control.perAttendeeByGrade[organiserGrade];
  const gradeLabel = GRADE_LABEL[organiserGrade];

  if (!userCap) {
    return {
      outcome: 'green',
      message: `No budget cap was entered; the ${gradeLabel} threshold of ${formatMoney(threshold)} per person applies (${control.label}).`,
      limit: formatMoney(threshold),
    };
  }

  // Absolute ceilings are a hard block with no amber exception band, checked
  // ahead of the grade threshold itself.
  if (userCap.amount > control.absoluteCeilingPerAttendee.amount) {
    return {
      outcome: 'red',
      message: `Requested budget of ${formatMoney(userCap)} per person exceeds the absolute ceiling of ${formatMoney(control.absoluteCeilingPerAttendee)} under ${control.label}.`,
      observed: formatMoney(userCap),
      limit: formatMoney(control.absoluteCeilingPerAttendee),
    };
  }

  if (control.absoluteCeilingTotalEvent) {
    const total = { amount: userCap.amount * attendeeCount, currency: 'GBP' };
    if (total.amount > control.absoluteCeilingTotalEvent.amount) {
      return {
        outcome: 'red',
        message: `Total requested spend of ${formatMoney(total)} exceeds the absolute event ceiling of ${formatMoney(control.absoluteCeilingTotalEvent)} under ${control.label}.`,
        observed: formatMoney(total),
        limit: formatMoney(control.absoluteCeilingTotalEvent),
      };
    }
  }

  if (userCap.amount <= threshold.amount) {
    return {
      outcome: 'green',
      message: `Requested budget of ${formatMoney(userCap)} per person is within the ${gradeLabel} threshold of ${formatMoney(threshold)} (${control.label}).`,
      observed: formatMoney(userCap),
      limit: formatMoney(threshold),
    };
  }

  return {
    outcome: 'amber',
    message: `Requested budget of ${formatMoney(userCap)} per person exceeds the ${gradeLabel} pre-approval threshold of ${formatMoney(threshold)} under ${control.label}. Pre-approval via MySupport is required before proceeding.`,
    observed: formatMoney(userCap),
    limit: formatMoney(threshold),
  };
}

function evaluateTaggedSpendCap(control, inputs) {
  if (inputs.attendeeTags === null) {
    return {
      outcome: 'unknown',
      message: `Attendee details have not been confirmed, so ${control.label} cannot be checked.`,
    };
  }

  const hasTaggedAttendee = inputs.attendeeTags.some((tag) => control.tags.includes(tag));
  if (!hasTaggedAttendee) {
    return { outcome: 'green', message: `No restricted-entity or Public Official attendees identified; ${control.label} does not apply.` };
  }

  const userCap = inputs.userBudgetCap;
  if (!userCap) {
    return {
      outcome: 'green',
      message: `No budget cap was entered; the ${formatMoney(control.capPerAttendee)} per person cap applies to restricted-entity/Public Official attendees under ${control.label}.`,
      limit: formatMoney(control.capPerAttendee),
    };
  }

  if (userCap.amount > control.capPerAttendee.amount) {
    return {
      outcome: 'red',
      message: `Requested budget of ${formatMoney(userCap)} per person exceeds the ${formatMoney(control.capPerAttendee)} cap that applies to restricted-entity/Public Official attendees under ${control.label}.`,
      observed: formatMoney(userCap),
      limit: formatMoney(control.capPerAttendee),
    };
  }

  return {
    outcome: 'green',
    message: `Requested budget of ${formatMoney(userCap)} per person is within the ${formatMoney(control.capPerAttendee)} cap for restricted-entity/Public Official attendees under ${control.label}.`,
    observed: formatMoney(userCap),
    limit: formatMoney(control.capPerAttendee),
  };
}

function evaluateAlcohol(control, inputs) {
  if (inputs.alcoholRequested === null) {
    return {
      outcome: 'unknown',
      message: `Whether alcohol is required has not been confirmed, so ${control.label} cannot be checked.`,
    };
  }
  if (!inputs.alcoholRequested) {
    return { outcome: 'green', message: `No alcohol requested; ${control.label} does not apply.` };
  }
  if (control.stance === 'prohibited') {
    return { outcome: 'red', message: `Alcohol is not permitted for this audience under ${control.label}.` };
  }
  if (control.stance === 'permitted_with_approval') {
    return { outcome: 'amber', message: `Alcohol is permitted under ${control.label} but requires explicit approval.` };
  }
  return { outcome: 'green', message: `Alcohol is permitted under ${control.label}.` };
}

function evaluateAttendeeClass(control, inputs) {
  if (inputs.attendeeTags === null) {
    return {
      outcome: 'unknown',
      message: `Attendee details have not been confirmed, so ${control.label} cannot be checked.`,
    };
  }
  const prohibited = inputs.attendeeTags.find((tag) => control.prohibitedAttendeeTags.includes(tag));
  if (prohibited) {
    return {
      outcome: 'red',
      message: `Attendee group includes "${prohibited}", which is not permitted under ${control.label}.`,
      observed: prohibited,
    };
  }
  return { outcome: 'green', message: `Attendee group is permitted under ${control.label}.` };
}

function evaluateEventSizeLimit(control, inputs) {
  if (inputs.attendeeCount === null) {
    return {
      outcome: 'unknown',
      message: `Attendee count has not been confirmed, so ${control.label} cannot be checked.`,
    };
  }
  if (inputs.attendeeCount > control.maxAttendees) {
    return {
      outcome: 'red',
      message: `${inputs.attendeeCount} attendees exceeds the maximum of ${control.maxAttendees} under ${control.label}.`,
      observed: String(inputs.attendeeCount),
      limit: String(control.maxAttendees),
    };
  }
  if (control.amberAboveAttendees && inputs.attendeeCount > control.amberAboveAttendees) {
    return {
      outcome: 'amber',
      message: `${inputs.attendeeCount} attendees exceeds the standard threshold of ${control.amberAboveAttendees} under ${control.label}. Approval required.`,
      observed: String(inputs.attendeeCount),
      limit: String(control.amberAboveAttendees),
    };
  }
  return { outcome: 'green', message: `${inputs.attendeeCount} attendees is within the standard limit under ${control.label}.` };
}

const EVALUATORS = {
  spend_threshold: evaluateSpendThreshold,
  graded_spend_threshold: evaluateGradedSpendThreshold,
  tagged_spend_cap: evaluateTaggedSpendCap,
  alcohol: evaluateAlcohol,
  attendee_class: evaluateAttendeeClass,
  event_size_limit: evaluateEventSizeLimit,
};

function normaliseInputs(inputs) {
  return {
    audience: inputs.audience ?? null,
    eventType: inputs.eventType ?? null,
    organiserGrade: inputs.organiserGrade ?? null,
    attendeeCount: inputs.attendeeCount ?? null,
    // Deliberately NOT defaulted to [] — an unset attendeeTags must read as
    // "not yet confirmed" (-> unknown), distinct from an explicitly empty list
    // (-> green, no prohibited tags present).
    attendeeTags: inputs.attendeeTags ?? null,
    alcoholRequested: inputs.alcoholRequested ?? null,
    eventDate: inputs.eventDate ?? null,
    userBudgetCap: inputs.userBudgetCap ?? null,
    exceptionReason: inputs.exceptionReason ?? null,
  };
}

/**
 * @param {Object} inputs - raw fields to evaluate (see EvaluatedInputs in types.js);
 *   `eventRequestId` is optional, carried through to the decision unchanged.
 * @param {import('../types.js').PolicyRule[]} rules
 * @param {Date} now - injected clock; evaluatedAt is derived from this, never from Date.now()
 * @returns {import('../types.js').PolicyDecision}
 */
export function evaluatePolicy(inputs, rules, now) {
  const inputsSnapshot = normaliseInputs(inputs);
  const inputsHash = hashValue(inputsSnapshot);
  const evaluatedAt = now.toISOString();
  // Content-addressed: identical inputs always produce an identical decision,
  // including this id — the strongest form of the determinism guarantee.
  const id = `decision-${inputsHash}`;

  const candidates = matchRules(inputsSnapshot, rules);
  const matchedRule = candidates[0] ?? null;

  const budget = calculateBudget(
    {
      attendeeCount: inputsSnapshot.attendeeCount ?? 0,
      userBudgetCap: inputsSnapshot.userBudgetCap,
      organiserGrade: inputsSnapshot.organiserGrade,
    },
    matchedRule
  );

  if (!matchedRule) {
    return {
      id,
      eventRequestId: inputs.eventRequestId ?? null,
      ruleSetVersion: rules[0]?.ruleSetVersion ?? 'unknown',
      matchedRuleId: null,
      matchedRuleVersion: null,
      outcome: 'unknown',
      budget,
      findings: [],
      reasons: [
        OUTCOME_HEADLINES.unknown,
        `No sample policy rule covers audience "${inputsSnapshot.audience ?? 'unspecified'}" with event type "${inputsSnapshot.eventType ?? 'unspecified'}" on ${inputsSnapshot.eventDate ?? 'the requested date'}.`,
      ],
      requiredApprovals: [],
      requiredEvidence: [],
      exceptionReasonRequired: false,
      canProceed: false,
      evaluatedAt,
      inputsHash,
      inputsSnapshot,
    };
  }

  const outcomeControls = matchedRule.controls.filter((control) => OUTCOME_DETERMINING_KINDS.has(control.kind));
  const orderedControls = CONTROL_EVALUATION_ORDER.flatMap((kind) =>
    outcomeControls.filter((control) => control.kind === kind)
  );

  const findings = orderedControls.map((control) => {
    const result = EVALUATORS[control.kind](control, inputsSnapshot);
    return { controlId: control.id, controlKind: control.kind, ...result };
  });

  const outcome = worstOutcome(findings.map((finding) => finding.outcome));

  const requiredApprovals = [];
  const requiredEvidence = [];
  let exceptionReasonRequired = false;

  for (const control of matchedRule.controls) {
    if (control.kind === 'approval') {
      const required =
        control.requiredWhen === 'always' ||
        ((control.requiredWhen === 'above_threshold' || control.requiredWhen === 'on_exception') &&
          outcome === 'amber');
      if (required) {
        requiredApprovals.push({ approverRole: control.approverRole, reason: control.label });
      }
    }
    if (control.kind === 'evidence') {
      const required = control.requiredWhen === 'always' || (control.requiredWhen === 'above_threshold' && outcome === 'amber');
      if (required) {
        for (const artefact of control.artefacts) {
          if (!requiredEvidence.includes(artefact)) requiredEvidence.push(artefact);
        }
      }
    }
    if (control.kind === 'exception_reason' && outcome === 'amber') {
      exceptionReasonRequired = true;
    }
  }

  const reasons = [OUTCOME_HEADLINES[outcome], ...findings.map(explain)];

  return {
    id,
    eventRequestId: inputs.eventRequestId ?? null,
    ruleSetVersion: matchedRule.ruleSetVersion,
    matchedRuleId: matchedRule.id,
    matchedRuleVersion: matchedRule.version,
    outcome,
    budget,
    findings,
    reasons,
    requiredApprovals,
    requiredEvidence,
    exceptionReasonRequired,
    canProceed: outcome === 'green',
    evaluatedAt,
    inputsHash,
    inputsSnapshot,
  };
}
