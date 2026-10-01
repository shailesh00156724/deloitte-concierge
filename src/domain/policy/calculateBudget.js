/**
 * Pure budget calculation. No DOM, no I/O, no Date.now().
 *
 * PRD §8: "maximum permitted total = policy allowance per attendee × attendee
 * count, subject to any overall event cap. If the user enters a lower cap, use
 * the lower amount. Show both per-person and total values."
 *
 * The user-entered budget cap is treated as PER-ATTENDEE (see EvaluatedInputs
 * in types.js) — with venue selection deferred there is no proposed total
 * spend to compare against the threshold, so the user's own per-attendee cap
 * stands in as the proposed-spend proxy (see evaluatePolicy.js).
 *
 * A rule carries exactly one of a flat `spend_threshold` control or a
 * `graded_spend_threshold` control (the latter varies by organiser grade,
 * per the real Deloitte Entertainment policy's Partner/Director-and-below
 * split) — this resolves either shape to the same per-attendee/event-cap pair.
 */

/**
 * @param {import('../types.js').PolicyRule} rule
 * @param {import('../types.js').OrganiserGrade|null} organiserGrade
 * @returns {{ perAttendee: import('../types.js').Money|null, overallEventCap: import('../types.js').Money|null }}
 */
function resolveSpendAllowance(rule, organiserGrade) {
  const flat = rule.controls.find((c) => c.kind === 'spend_threshold');
  if (flat) return { perAttendee: flat.perAttendee, overallEventCap: flat.overallEventCap ?? null };

  const graded = rule.controls.find((c) => c.kind === 'graded_spend_threshold');
  if (graded) {
    return {
      perAttendee: organiserGrade ? graded.perAttendeeByGrade[organiserGrade] : null,
      overallEventCap: graded.absoluteCeilingTotalEvent ?? null,
    };
  }

  return { perAttendee: null, overallEventCap: null };
}

/**
 * @param {{ attendeeCount: number, userBudgetCap: import('../types.js').Money|null, organiserGrade?: import('../types.js').OrganiserGrade|null }} inputs
 * @param {import('../types.js').PolicyRule|null} matchedRule
 * @returns {import('../types.js').BudgetCalculation}
 */
export function calculateBudget(inputs, matchedRule) {
  const { attendeeCount, userBudgetCap, organiserGrade = null } = inputs;

  const { perAttendee: policyAllowancePerAttendee, overallEventCap } = matchedRule
    ? resolveSpendAllowance(matchedRule, organiserGrade)
    : { perAttendee: null, overallEventCap: null };

  const policyMaximumTotal = policyAllowancePerAttendee
    ? { amount: policyAllowancePerAttendee.amount * attendeeCount, currency: 'GBP' }
    : null;

  // Step A: the lower of policy per-attendee allowance and the user's own cap.
  // A tie is attributed to the policy allowance, not the user cap.
  let effectivePerAttendee = null;
  let bindingConstraint = 'none';

  if (policyAllowancePerAttendee && userBudgetCap) {
    if (policyAllowancePerAttendee.amount <= userBudgetCap.amount) {
      effectivePerAttendee = policyAllowancePerAttendee;
      bindingConstraint = 'policy_per_attendee';
    } else {
      effectivePerAttendee = userBudgetCap;
      bindingConstraint = 'user_cap';
    }
  } else if (policyAllowancePerAttendee) {
    effectivePerAttendee = policyAllowancePerAttendee;
    bindingConstraint = 'policy_per_attendee';
  } else if (userBudgetCap) {
    effectivePerAttendee = userBudgetCap;
    bindingConstraint = 'user_cap';
  }

  const tentativeTotal = effectivePerAttendee
    ? effectivePerAttendee.amount * attendeeCount
    : null;

  // Step B: an overall event cap can override the per-attendee result if it
  // would produce a lower total.
  let effectiveTotalBudget;
  if (overallEventCap && (tentativeTotal === null || overallEventCap.amount < tentativeTotal)) {
    effectiveTotalBudget = overallEventCap;
    bindingConstraint = 'policy_event_cap';
    effectivePerAttendee =
      attendeeCount > 0
        ? { amount: Math.floor(overallEventCap.amount / attendeeCount), currency: 'GBP' }
        : { amount: overallEventCap.amount, currency: 'GBP' };
  } else {
    effectiveTotalBudget = tentativeTotal !== null ? { amount: tentativeTotal, currency: 'GBP' } : null;
  }

  return {
    policyAllowancePerAttendee,
    attendeeCount,
    policyMaximumTotal,
    overallEventCap,
    userBudgetCap,
    effectiveTotalBudget,
    effectivePerAttendee,
    bindingConstraint,
  };
}
