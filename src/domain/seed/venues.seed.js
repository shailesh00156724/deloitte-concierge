/**
 * Seed venue listings. Fictional, not real businesses — styled like a
 * comparison-site result set so the mock booking flow has something to
 * present, but every name, address and review count is invented. No real
 * restaurant, bar or venue operator should be inferable from this data
 * (consistent with the data-minimisation principle already applied to
 * people in users.seed.js — see deferred-work.md).
 *
 * Deliberately spans the affordability line: at the sample £45pp
 * project-team threshold, roughly half these venues sit at or under it and
 * half sit over it, so matchVenues has real within-budget and over-budget
 * cases to flag without needing special-cased test fixtures.
 *
 * @type {import('../types.js').Venue[]}
 */

import { gbp } from '../money.js';

const SAMPLE_SOURCE = 'SAMPLE — not a real venue listing';

export const venues = [
  {
    id: 'the-oakwood-tavern',
    name: 'The Oakwood Tavern',
    area: 'Holborn',
    distanceMiles: 0.4,
    suitableFor: ['dinner_and_drinks', 'drinks_and_nibbles'],
    perHeadFrom: gbp(32),
    maxCapacity: 40,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian', 'vegan'],
    rating: 4.3,
    reviewCount: 212,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'bellina-kitchen',
    name: 'Bellina Kitchen',
    area: 'Clerkenwell',
    distanceMiles: 0.9,
    suitableFor: ['dinner_and_drinks', 'activity_plus_meal'],
    perHeadFrom: gbp(38),
    maxCapacity: 60,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
    rating: 4.6,
    reviewCount: 384,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'the-glasshouse-rooftop',
    name: 'The Glasshouse Rooftop',
    area: 'Farringdon',
    distanceMiles: 1.2,
    suitableFor: ['dinner_and_drinks', 'drinks_and_nibbles', 'large_event'],
    perHeadFrom: gbp(65),
    maxCapacity: 120,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian', 'gluten-free'],
    rating: 4.5,
    reviewCount: 501,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'spindle-and-sage',
    name: 'Spindle & Sage',
    area: 'Bloomsbury',
    distanceMiles: 0.7,
    suitableFor: ['dinner_and_drinks', 'drinks_and_nibbles'],
    perHeadFrom: gbp(45),
    maxCapacity: 50,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
    rating: 4.2,
    reviewCount: 167,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'the-strike-and-slice',
    name: 'The Strike & Slice',
    area: 'Shoreditch',
    distanceMiles: 2.1,
    suitableFor: ['activity_plus_meal'],
    perHeadFrom: gbp(35),
    maxCapacity: 36,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian'],
    rating: 4.1,
    reviewCount: 98,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'milltree-social',
    name: 'Milltree Social',
    area: 'Angel',
    distanceMiles: 1.6,
    suitableFor: ['drinks_and_nibbles', 'dinner_and_drinks'],
    perHeadFrom: gbp(28),
    maxCapacity: 30,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian', 'vegan'],
    rating: 3.9,
    reviewCount: 74,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'the-copperleaf-room',
    name: 'The Copperleaf Room',
    area: 'Covent Garden',
    distanceMiles: 1.0,
    suitableFor: ['dinner_and_drinks', 'large_event'],
    perHeadFrom: gbp(80),
    maxCapacity: 150,
    servesAlcohol: true,
    dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
    rating: 4.7,
    reviewCount: 623,
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'harrow-lane-bistro',
    name: 'Harrow Lane Bistro',
    area: "King's Cross",
    distanceMiles: 1.4,
    suitableFor: ['dinner_and_drinks', 'drinks_and_nibbles', 'activity_plus_meal'],
    perHeadFrom: gbp(42),
    maxCapacity: 45,
    servesAlcohol: false,
    dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
    rating: 4.4,
    reviewCount: 289,
    sourceLabel: SAMPLE_SOURCE,
  },
];
