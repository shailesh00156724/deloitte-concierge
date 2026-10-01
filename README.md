# Deloitte Concierge (prototype) — Slice 2

Simulated prototype — no real bookings, approvals or payments are made. Policy thresholds shown are drawn from the published Deloitte UK/Switzerland Entertainment, Gifts & Donations policy (ss.2, 3, 4.1.1, 7) for the `client_social` audience only; everything else (internal-audience policy rules, venue listings, bookings) is sample data for demonstration.

This covers conversational intake (a rule-based chat that gathers the details of an event), a deterministic policy engine (Green/Amber/Red/Unknown + budget calculation), a sample venue comparison list filtered and flagged against the approved budget, and a mock booking/confirmation flow. Approvals, audit and admin screens are out of scope — see `_bmad-output/implementation-artifacts/deferred-work.md`.

## Requirements

Nothing to install. You need two things already on your machine:

- **Python 3** (any recent version) — to serve the static files
- **Node.js 20+** (ideally the version with the built-in `node --test` runner) — to run the test suite

There is no `package.json`, no `npm install`, no bundler. The app is plain ES modules loaded directly by the browser.

## Run the app

From this directory:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in a browser.

Stop the server with `Ctrl+C`. (Any static file server works — `npx serve`, VS Code's Live Server, etc. — Python's is just guaranteed to already be installed.)

## Run the tests

```bash
node --test test/
```

This runs the full suite (pure `domain/` logic: policy evaluation, budget calculation, rule matching, and chat slot extraction/validation). No DOM tests are included — the UI is verified manually in the browser, since adding a DOM-testing library would violate the zero-dependency constraint.

## Try it

Type a message describing the event, e.g.:

> Client dinner, I am a Partner

The assistant will ask for anything still missing (date and size, alcohol/attendee details, budget) in a fixed order. Once everything is captured you'll see a **Review your event details** panel — correct anything via the **Edit** links. The policy check runs automatically as soon as the draft is complete, showing the Green/Amber/Red/Unknown result with a budget breakdown — there's no button to press.

If the outcome is Green or Amber-but-proceedable, a **Venue options (sample)** panel appears below it: a short list of fictional venues with per-head pricing, filtered to the event type, size and alcohol requirement. Venues within the policy-approved budget can be selected; venues over budget are shown with a red "Over budget" chip and a disabled button, stating the overage. Pick one, then **Confirm and book** to get a mock **Booking confirmed (simulated)** screen with a reference number. Editing any event detail afterwards clears the selection/booking and re-evaluates policy from scratch.

Known phrasing to avoid triggering a re-ask: dates can be given as "15th November 2026", "15/11/2026", "next Thursday" etc.; attendee counts need a unit word or "of us" (e.g. "20 people", "20 of us") — a bare number on its own is intentionally not read as a count, since it also catches dates and other digits in the same sentence.

## Project structure

```
index.html / styles.css     static shell
src/domain/                 pure logic — no DOM, no localStorage, no Date.now()
  policy/                   evaluatePolicy, calculateBudget, matchRules, explain
  chat/                     slot registry, extraction, prompting, turn handling
  venue/                    matchVenues — filters/flags/ranks venues against the approved budget
  booking/                  createBooking — builds a simulated Booking
  seed/                     policy rules, demo scenarios, sample venue listings
src/ports/                  JSDoc-only contracts (persistence, venue search, booking)
src/adapters/                localStorage persistence, seed-data venue search, mock booking
src/ui/                     DOM rendering components
src/main.js                 the single stateful orchestrator
test/                       node --test suite
```

## Known limitations

- Client-side only — "Red blocks booking" is a UI guard, not server-enforced.
- Regex-based date/number parsing is a known brittleness risk; values are always echoed back with an Edit link so a misparse is easy to catch and correct.
- No automated UI/DOM tests (would require an npm dependency); verified manually.
- Venue data is fictional sample data (`venues.seed.js`), not a real search — no live availability, pricing or map data.
- Bookings are entirely simulated: no network call, no payment, no confirmation email, and no connection to any real venue's booking system.
- Venue cost does not feed back into the policy decision — the policy sets the budget first, and venues are filtered/flagged against it afterwards, so selecting an expensive venue can never change an already-computed Green/Amber/Red/Unknown outcome.
