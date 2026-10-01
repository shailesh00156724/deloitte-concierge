/**
 * Renders the venue list once the policy has produced a budget the user can
 * proceed on. No venue logic here — only presentation of what matchVenues()
 * already filtered, flagged and ranked. Venue data is fictional SAMPLE
 * data (see venues.seed.js); this is a mock comparison-site listing, not a
 * live search.
 */

import { formatMoney } from '../domain/money.js';
import { h } from './render.js';

/**
 * @param {{ options: import('../domain/types.js').VenueOption[], selectedVenueId: string|null, budgetPerAttendee: import('../domain/types.js').Money|null, onSelect: (venueId: string) => void, onConfirm: () => void }} props
 */
export function renderVenueOptionsPanel(props) {
  const panel = h('section', { class: 'venue-panel', 'aria-label': 'Venue options' });
  panel.appendChild(h('h2', { class: 'venue-panel__title', text: 'Venue options (sample)' }));
  panel.appendChild(
    h('p', {
      class: 'venue-panel__sample-note',
      text: 'Sample listing for this prototype — not a live search, and not real venues.',
    })
  );

  if (props.options.length === 0) {
    panel.appendChild(h('p', { text: 'No venues match this event — try adjusting the details.' }));
    return panel;
  }

  const list = h('div', { class: 'venue-panel__list' });

  for (const option of props.options) {
    const { venue, estimatedTotal, withinBudget, overBudgetBy } = option;
    const isSelected = props.selectedVenueId === venue.id;

    const classNames = ['venue-card'];
    if (isSelected) classNames.push('venue-card--selected');
    if (!withinBudget) classNames.push('venue-card--over-budget');

    const card = h('article', { class: classNames.join(' ') });

    const header = h('div', { class: 'venue-card__header' }, [
      h('h3', { class: 'venue-card__name', text: venue.name }),
    ]);
    header.appendChild(
      withinBudget
        ? h('span', { class: 'status-chip status-chip--green', text: isSelected ? 'Selected' : 'Within budget' })
        : h('span', { class: 'status-chip status-chip--red', text: 'Over budget' })
    );
    card.appendChild(header);

    card.appendChild(
      h('p', {
        class: 'venue-card__meta',
        text: `${venue.area} · ${venue.distanceMiles} mi · ${venue.rating}★ (${venue.reviewCount} reviews)`,
      })
    );

    card.appendChild(
      h('div', { class: 'venue-card__price' }, [
        h('span', { text: `${formatMoney(venue.perHeadFrom)} per head` }),
        h('span', { text: `Est. total ${formatMoney(estimatedTotal)}` }),
      ])
    );

    if (!withinBudget && overBudgetBy) {
      card.appendChild(
        h('p', {
          class: 'venue-card__overage',
          text: `${formatMoney(overBudgetBy)} per head over the approved budget.`,
        })
      );
    }

    card.appendChild(
      h('button', {
        type: 'button',
        class: 'venue-card__action',
        text: isSelected ? 'Selected' : 'Select',
        disabled: withinBudget ? undefined : 'disabled',
        onclick: withinBudget ? () => props.onSelect(venue.id) : undefined,
      })
    );

    list.appendChild(card);
  }

  panel.appendChild(list);

  const canConfirm = Boolean(props.selectedVenueId);
  panel.appendChild(
    h('button', {
      type: 'button',
      class: 'venue-panel__action',
      text: 'Confirm and book',
      disabled: canConfirm ? undefined : 'disabled',
      onclick: canConfirm ? props.onConfirm : undefined,
    })
  );

  return panel;
}
