/**
 * Renders a PolicyDecision: status chip, reasons, budget breakdown with the
 * binding-constraint sentence, and a blocked notice for anything other than
 * green. No policy logic here — only presentation of what evaluatePolicy()
 * already decided.
 */

import { formatMoney } from '../domain/money.js';
import { h } from './render.js';

const STATUS_LABEL = { green: 'Green', amber: 'Amber', red: 'Red', unknown: 'Unknown' };

const BINDING_CONSTRAINT_LABEL = {
  policy_per_attendee: 'the policy threshold',
  policy_event_cap: 'the overall event ceiling',
  user_cap: 'your own budget cap',
  none: null,
};

/**
 * @param {import('../domain/types.js').PolicyDecision} decision
 */
export function renderPolicyResultCard(decision) {
  const card = h('section', { class: 'policy-result', 'aria-label': 'Policy result' });

  card.appendChild(
    h('span', { class: `status-chip status-chip--${decision.outcome}`, text: STATUS_LABEL[decision.outcome] })
  );

  const reasons = h('ul', { class: 'policy-result__reasons' });
  for (const reason of decision.reasons) {
    reasons.appendChild(h('li', { text: reason }));
  }
  card.appendChild(reasons);

  const { budget } = decision;
  if (budget.effectivePerAttendee || budget.effectiveTotalBudget) {
    const budgetBox = h('div', { class: 'policy-result__budget' });
    if (budget.effectivePerAttendee) {
      budgetBox.appendChild(
        h('div', { class: 'policy-result__budget-row' }, [
          h('span', { text: 'Per person' }),
          h('span', { text: formatMoney(budget.effectivePerAttendee) }),
        ])
      );
    }
    if (budget.effectiveTotalBudget) {
      budgetBox.appendChild(
        h('div', { class: 'policy-result__budget-row' }, [
          h('span', { text: `Total (${budget.attendeeCount} attendees)` }),
          h('span', { text: formatMoney(budget.effectiveTotalBudget) }),
        ])
      );
    }
    const constraintLabel = BINDING_CONSTRAINT_LABEL[budget.bindingConstraint];
    if (constraintLabel) {
      budgetBox.appendChild(
        h('p', { class: 'policy-result__binding-note', text: `This figure is set by ${constraintLabel}.` })
      );
    }
    card.appendChild(budgetBox);
  }

  if (!decision.canProceed) {
    card.appendChild(
      h('p', {
        class: 'policy-result__blocked',
        text:
          decision.outcome === 'amber'
            ? 'Booking is blocked until the required approval is obtained (simulated — not implemented in this slice).'
            : 'Booking is blocked and cannot proceed from here.',
      })
    );
  }

  return card;
}
