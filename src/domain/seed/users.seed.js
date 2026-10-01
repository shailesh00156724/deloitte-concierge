/**
 * Seed users. Synthetic data only — no real Deloitte employees (PRD §13).
 * @type {import('../types.js').User[]}
 */
export const users = [
  {
    id: 'user-1',
    name: 'Priya Chandra',
    role: 'organiser',
    email: 'priya.chandra@example.com',
    officeLocation: 'London',
  },
  {
    id: 'user-2',
    name: 'Tom Whitfield',
    role: 'approver',
    email: 'tom.whitfield@example.com',
    officeLocation: 'Manchester',
  },
  {
    id: 'user-3',
    name: 'Aisha Rahman',
    role: 'finance_reviewer',
    email: 'aisha.rahman@example.com',
    officeLocation: 'Birmingham',
  },
  {
    id: 'user-4',
    name: 'Dan Okafor',
    role: 'administrator',
    email: 'dan.okafor@example.com',
    officeLocation: 'Leeds',
  },
];

export const DEFAULT_ORGANISER_ID = 'user-1';
