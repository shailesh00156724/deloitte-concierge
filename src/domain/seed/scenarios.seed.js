/**
 * Four fully-specified demo event requests, one per policy outcome, so every
 * status is reachable without typing a transcript by hand. See
 * policyRules.seed.js for the real-policy rule data these are designed against.
 *
 * @type {Record<'green'|'amber'|'red'|'unknown', import('../types.js').EventRequest>}
 */
import { gbp } from '../money.js';
import { DEFAULT_ORGANISER_ID } from './users.seed.js';

function baseRequest(overrides) {
  return {
    id: overrides.id,
    organiserId: DEFAULT_ORGANISER_ID,
    purpose: overrides.purpose,
    eventType: overrides.eventType,
    audience: overrides.audience,
    organiserGrade: overrides.organiserGrade ?? 'director_or_below',
    attendeeCount: overrides.attendeeCount,
    attendeeGroupLabel: overrides.attendeeGroupLabel,
    attendeeTags: overrides.attendeeTags ?? [],
    eventDate: overrides.eventDate,
    startTime: overrides.startTime ?? '19:00',
    durationMinutes: overrides.durationMinutes ?? 150,
    location: overrides.location ?? 'EC2 postcode area',
    searchRadiusMiles: overrides.searchRadiusMiles ?? 2,
    dietaryNeeds: overrides.dietaryNeeds ?? 'One vegetarian, no other restrictions',
    cuisineOrActivityPreference: overrides.cuisineOrActivityPreference ?? 'Italian',
    alcoholRequested: overrides.alcoholRequested ?? true,
    userBudgetCap: overrides.userBudgetCap ?? null,
    exceptionReason: overrides.exceptionReason ?? null,
    status: 'draft',
  };
}

export const scenarios = {
  green: baseRequest({
    id: 'scenario-green',
    purpose: 'Client relationship dinner',
    eventType: 'dinner_and_drinks',
    audience: 'client_social',
    organiserGrade: 'director_or_below',
    attendeeCount: 6,
    attendeeGroupLabel: 'RetailCo stakeholders',
    eventDate: '2026-11-12',
    userBudgetCap: gbp(80),
  }),

  amber: baseRequest({
    id: 'scenario-amber',
    purpose: 'Client relationship dinner, higher-end venue',
    eventType: 'dinner_and_drinks',
    audience: 'client_social',
    organiserGrade: 'director_or_below',
    attendeeCount: 6,
    attendeeGroupLabel: 'GlobalBank stakeholders',
    eventDate: '2026-11-20',
    userBudgetCap: gbp(120),
  }),

  red: baseRequest({
    id: 'scenario-red',
    purpose: 'Client relationship dinner',
    eventType: 'dinner_and_drinks',
    audience: 'client_social',
    organiserGrade: 'partner',
    attendeeCount: 4,
    attendeeGroupLabel: 'RetailCo stakeholders',
    attendeeTags: ['audit_target'],
    eventDate: '2026-11-18',
    userBudgetCap: gbp(90),
  }),

  unknown: baseRequest({
    id: 'scenario-unknown',
    purpose: 'Large client showcase event',
    eventType: 'large_event',
    audience: 'client_social',
    organiserGrade: 'director_or_below',
    attendeeCount: 40,
    attendeeGroupLabel: 'RetailCo wider stakeholder group',
    eventDate: '2026-11-12',
    userBudgetCap: gbp(60),
  }),
};
