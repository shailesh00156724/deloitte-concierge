/**
 * Seed policy rule set.
 *
 * `client-social-standard` below reflects the real Deloitte UK/Switzerland
 * "Entertainment, Gifts & Donations" policy (sections 2, 3, 4.1.1 and 7, as
 * supplied by the user) — its thresholds are genuine, not invented, and its
 * `sourceLabel` cites the policy rather than saying SAMPLE.
 *
 * That policy only covers third-party (client) entertainment — it has nothing
 * to say about internal-only Deloitte gatherings. `project-team-standard` and
 * `leadership-standard` below cover `deloitte_project_team` and
 * `deloitte_leadership` with clearly-labelled SAMPLE thresholds (per the
 * original plan), so internal events also reach a real Green/Amber/Red
 * outcome rather than always resolving to Unknown. Their `sourceLabel` says
 * SAMPLE explicitly — unlike `client-social-standard`, which cites a real
 * policy document — and the UI must never present them as official.
 *
 * Deferred (see _bmad-output/implementation-artifacts/deferred-work.md):
 * the prohibition on entertainment during an active bid/fee negotiation with
 * a client decision-maker present, and the spouse/plus-one attendance rule —
 * both need new EventRequest fields outside this slice's current scope.
 *
 * Outcomes arising from this one rule, from data alone:
 *  - Green:   spend at or under the organiser-grade threshold, no restricted
 *             attendees, not an audit target.
 *  - Amber:   N/A for this rule — the real policy has no "ask for an
 *             exception" band; a request either clears the threshold or it
 *             needs pre-approval via MySupport, which this slice surfaces as
 *             an approval requirement rather than a conditional pass.
 *  - Red:     an audit-target attendee (absolute block, regardless of value);
 *             a restricted-entity/Public-Official attendee above their £150
 *             cap; spend above the £1,500/head or £5,000/event ceiling.
 *  - Unknown: client_social + large_event (not a covered event type under the
 *             real policy); event date outside any rule's effective window.
 *
 * `project-team-standard` and `leadership-standard` are SAMPLE data, not
 * drawn from any real Deloitte document — see their sourceLabel.
 */

import { gbp } from '../money.js';

export const RULE_SET_VERSION = '2026.1';

const POLICY_SOURCE =
  'Deloitte UK/Switzerland Entertainment, Gifts & Donations policy (ss.2, 3, 4.1.1, 7)';

const SAMPLE_SOURCE = 'SAMPLE — not official Deloitte policy';

/** @type {import('../types.js').PolicyRule[]} */
export const policyRules = [
  {
    id: 'client-social-standard',
    version: '1.0',
    ruleSetVersion: RULE_SET_VERSION,
    audience: 'client_social',
    eventTypes: ['dinner_and_drinks', 'drinks_and_nibbles', 'activity_plus_meal'],
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    specificity: 10,
    controls: [
      {
        kind: 'graded_spend_threshold',
        id: 'spend-client-social-graded',
        label: 'Client entertainment pre-approval threshold (organiser grade)',
        perAttendeeByGrade: {
          partner: gbp(150),
          director_or_below: gbp(100),
        },
        absoluteCeilingPerAttendee: gbp(1500),
        absoluteCeilingTotalEvent: gbp(5000),
      },
      {
        kind: 'tagged_spend_cap',
        id: 'cap-restricted-entity-public-official',
        label: 'Restricted entity / Public Official spend cap',
        tags: ['restricted_entity', 'public_official'],
        capPerAttendee: gbp(150),
      },
      {
        kind: 'attendee_class',
        id: 'attendee-class-audit-target',
        label: 'Audit independence restriction',
        permittedAudiences: ['client_social'],
        prohibitedAttendeeTags: ['audit_target'],
      },
      {
        kind: 'approval',
        id: 'approval-client-social',
        label: 'Pre-approval via MySupport',
        approverRole: 'engagement_partner',
        requiredWhen: 'above_threshold',
      },
      {
        kind: 'evidence',
        id: 'evidence-client-social',
        label: 'Client entertainment evidence requirement',
        artefacts: ['receipts', 'attendee_list'],
        requiredWhen: 'always',
      },
    ],
    sourceLabel: POLICY_SOURCE,
  },
  {
    id: 'project-team-standard',
    version: '1.0',
    ruleSetVersion: RULE_SET_VERSION,
    audience: 'deloitte_project_team',
    eventTypes: 'all',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    specificity: 10,
    controls: [
      {
        kind: 'spend_threshold',
        id: 'spend-project-team',
        label: 'Internal team event spend allowance (sample)',
        perAttendee: gbp(45),
        amberBandTo: gbp(65),
      },
      {
        kind: 'alcohol',
        id: 'alcohol-project-team',
        label: 'Internal team event alcohol policy (sample)',
        stance: 'permitted',
        perAttendeeSubLimit: gbp(15),
      },
      {
        kind: 'event_size_limit',
        id: 'size-project-team',
        label: 'Internal team event size limit (sample)',
        maxAttendees: 60,
        amberAboveAttendees: 25,
      },
      {
        kind: 'approval',
        id: 'approval-project-team',
        label: 'Line manager approval (sample)',
        approverRole: 'practice_leader',
        requiredWhen: 'above_threshold',
      },
      {
        kind: 'evidence',
        id: 'evidence-project-team',
        label: 'Internal team event evidence requirement (sample)',
        artefacts: ['receipts'],
        requiredWhen: 'above_threshold',
      },
    ],
    sourceLabel: SAMPLE_SOURCE,
  },
  {
    id: 'leadership-standard',
    version: '1.0',
    ruleSetVersion: RULE_SET_VERSION,
    audience: 'deloitte_leadership',
    eventTypes: 'all',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    specificity: 10,
    controls: [
      {
        kind: 'spend_threshold',
        id: 'spend-leadership',
        label: 'Leadership event spend allowance (sample)',
        perAttendee: gbp(75),
        overallEventCap: gbp(5000),
      },
      {
        kind: 'alcohol',
        id: 'alcohol-leadership',
        label: 'Leadership event alcohol policy (sample)',
        stance: 'permitted',
      },
      {
        kind: 'event_size_limit',
        id: 'size-leadership',
        label: 'Leadership event size limit (sample)',
        maxAttendees: 40,
      },
      {
        kind: 'approval',
        id: 'approval-leadership',
        label: 'Practice leader approval (sample)',
        approverRole: 'practice_leader',
        requiredWhen: 'always',
      },
      {
        kind: 'evidence',
        id: 'evidence-leadership',
        label: 'Leadership event evidence requirement (sample)',
        artefacts: ['receipts', 'attendee_list'],
        requiredWhen: 'always',
      },
    ],
    sourceLabel: SAMPLE_SOURCE,
  },
];
