/**
 * Review panel: label/value rows for every slot, with an Edit link per row
 * that sets the chat's targetSlot (see main.js), plus inline validation.
 * Policy evaluation runs automatically once the draft is complete (see
 * main.js's autoEvaluatePolicy) — there is no action to trigger here.
 * Mirrors the slot registry exactly so there is one source of truth for
 * what fields exist (domain/chat/slots.js).
 */

import { SLOTS } from '../domain/chat/slots.js';
import { validateDraft } from '../domain/chat/validateDraft.js';
import { h } from './render.js';

const GROUP_LABELS = {
  1: 'Event basics',
  2: 'Date and size',
  3: 'Alcohol and attendees',
  4: 'Budget',
};

/**
 * @param {{ draft: Object, onEdit: (key: string) => void }} props
 */
export function renderReviewPanel(props) {
  const panel = h('section', { class: 'review-panel', 'aria-label': 'Review your event details' });
  panel.appendChild(h('h2', { class: 'review-panel__title', text: 'Review your event details' }));

  const groups = [1, 2, 3, 4, null];
  for (const groupNumber of groups) {
    const slotsInGroup = SLOTS.filter((s) => s.group === groupNumber || (groupNumber === null && !s.mandatory));
    if (slotsInGroup.length === 0) continue;

    const groupEl = h('div', { class: 'review-panel__group' });
    if (groupNumber !== null) {
      groupEl.appendChild(h('div', { class: 'review-panel__group-label', text: GROUP_LABELS[groupNumber] }));
    } else {
      groupEl.appendChild(h('div', { class: 'review-panel__group-label', text: 'Additional details' }));
    }

    for (const slot of slotsInGroup) {
      const value = props.draft[slot.key];
      const isMissing = value === null || value === undefined;
      const displayValue = isMissing ? 'Not yet provided' : slot.format(value);

      groupEl.appendChild(
        h('div', { class: 'review-row' }, [
          h('span', { class: 'review-row__label', text: slot.key }),
          h('span', { class: `review-row__value${isMissing ? ' review-row__value--missing' : ''}` }, [
            displayValue,
            h('button', {
              type: 'button',
              class: 'review-row__edit',
              text: 'Edit',
              onclick: () => props.onEdit(slot.key),
            }),
          ]),
        ])
      );
    }

    panel.appendChild(groupEl);
  }

  const errors = validateDraft(props.draft);

  if (errors.length > 0) {
    const errorBox = h('ul', { class: 'review-panel__errors' });
    for (const error of errors) {
      errorBox.appendChild(h('li', { text: error }));
    }
    panel.appendChild(errorBox);
  }

  return panel;
}
