# Deferred Work — Deloitte Concierge

Work knowingly out of scope for the current slices, with the reason it's deferred rather than cut.

## Delivered in Slice 2

Venue recommendation and mock booking/payment, listed below as out of scope for Slice 1, have since been delivered: a sample venue comparison list (`src/domain/seed/venues.seed.js`, filtered/ranked by `src/domain/venue/matchVenues.js`) and a simulated booking flow (`src/domain/booking/createBooking.js`). See README.md "Try it" for the user-facing flow.

**Architectural decision (2026-10-01): venue cost does not feed back into `evaluatePolicy`.** `matchVenues` reads `decision.budget.effectivePerAttendee` to flag venues as within/over budget, but venue price is never added to `EvaluatedInputs`. Feeding it in would change `inputsHash` on venue selection, which would invalidate the very policy decision that authorised selecting that venue — a circular dependency. The rule is kept to one sentence: the policy decides the budget; the budget gates the venues. If a future slice needs venue cost to actually influence the policy outcome (e.g. a hard ceiling check against the real quoted total), it must be a deliberate second evaluation pass, not a field added to `EvaluatedInputs`.

## Out of scope for this slice entirely (per the original plan)

- Approval workflow (the engine returns `requiredApprovals`/`requiredEvidence`, but no approver ever actually approves anything in this slice)
- Audit trail
- Admin screens

## Deferred from the real policy document (decided 2026-10-01)

The user supplied the real Deloitte UK/Switzerland "Entertainment, Gifts & Donations" policy (ss.2, 3, 4.1.1, 7), which is now the source for `client-social-standard` in `src/domain/seed/policyRules.seed.js`. Two of its rules need `EventRequest` fields that don't exist yet in this slice's chat/schema, so they are deferred rather than implemented against guessed inputs:

### 1. Active bid / fee-negotiation restriction

The policy prohibits entertainment of a client decision-maker while Deloitte is in an active bid, tender, or fee negotiation with that client. This needs a new field — e.g. `isActiveBidOrFeeNegotiation: boolean|null` — captured as a mandatory chat slot, plus a new `PolicyControl` (or an extension of `attendee_class`) that treats this as an absolute block regardless of spend, similar to the existing `audit_target` tag.

### 2. Spouses / plus-ones attendance

The policy treats entertainment involving attendees' spouses or plus-ones differently (tighter scrutiny / different approval path). This needs a new field — e.g. `includesSpousesOrPlusOnes: boolean|null` — and a corresponding control once the exact treatment is confirmed.

Both are tracked here rather than guessed at, per PRD §18 ("do not invent official Deloitte policy"): inventing the mechanics of these two rules would risk misrepresenting real compliance policy, which is a different risk than labelling invented *demonstration* thresholds as sample data.

## Resolved: internal-only audiences now have SAMPLE rules (decided 2026-10-01)

`deloitte_project_team` and `deloitte_leadership` have no matching rule under the real policy, which only covers third-party/client entertainment. Rather than leaving every internal event as a permanent Unknown, two clearly-labelled SAMPLE rules (`project-team-standard`, `leadership-standard` in `policyRules.seed.js`, `sourceLabel: 'SAMPLE — not official Deloitte policy'`) now give these audiences real Green/Amber/Red outcomes for demonstration purposes. Unknown is still reachable — the seeded `unknown` scenario now uses `client_social` + `large_event`, an event type the real policy doesn't cover for that audience — so all four outcomes remain demonstrable without conflating "no sample rule written yet" with "the real policy has no answer here." If a future slice adds genuine internal-entertainment policy text, these two rules should be replaced with ones citing the real document, not merely re-labelled.

## Known gap: named real contacts in policy §7

The real policy document's "Contacts" section names real Deloitte individuals (role: who to contact for guidance/approval). These have **not** been included in any seed data, UI copy, or committed file, consistent with PRD §13's data-minimisation principle — even though they are not credentials/secrets in the strict sense. If a future slice wants to surface "who approves this," a synthetic contact should be used instead, matching the pattern already used in `users.seed.js`.
