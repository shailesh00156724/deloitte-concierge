/**
 * Renders a confirmed Booking: status chip, reference, a summary table, and
 * a prominent simulated notice. No booking logic here — only presentation
 * of what createBooking() already produced.
 */

import { formatMoney } from '../domain/money.js';
import { h } from './render.js';

/**
 * @param {{ booking: import('../domain/types.js').Booking, onRestart: () => void }} props
 */
export function renderBookingConfirmation(props) {
  const { booking } = props;
  const card = h('section', { class: 'booking-confirmation', 'aria-label': 'Booking confirmation' });

  card.appendChild(
    h('span', { class: 'status-chip status-chip--green', text: 'Booking confirmed (simulated)' })
  );

  card.appendChild(
    h('p', { class: 'booking-confirmation__reference' }, [
      'Reference ',
      h('strong', { text: booking.reference }),
    ])
  );

  const table = h('div', { class: 'booking-confirmation__table' });
  const rows = [
    ['Venue', booking.venueName],
    ['Date', booking.eventDate],
    ['Time', booking.startTime ?? 'Not specified'],
    ['Attendees', String(booking.attendeeCount)],
    ['Per head', formatMoney(booking.estimatedPerHead)],
    ['Estimated total', formatMoney(booking.estimatedTotal)],
  ];
  for (const [label, value] of rows) {
    table.appendChild(
      h('div', { class: 'booking-confirmation__row' }, [h('span', { text: label }), h('span', { text: value })])
    );
  }
  card.appendChild(table);

  card.appendChild(
    h('p', {
      class: 'booking-confirmation__notice',
      text: 'This is a simulated booking. No reservation has been made, no confirmation has been sent and no payment has been taken.',
    })
  );

  card.appendChild(
    h('button', {
      type: 'button',
      class: 'booking-confirmation__restart',
      text: 'Start a new event',
      onclick: props.onRestart,
    })
  );

  return card;
}
