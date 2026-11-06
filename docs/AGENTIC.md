# Writing agent requests that keep you in control

The agent fills every gap you leave with its own decisions. A senior using an agent decides the
architecture and lets the agent type. Loose request = the agent designs your system.

## Request template
```
Goal:        one sentence, the user-visible outcome
Issue:       #N (milestone M?)
Scope:       files/dirs you may touch: apps/api/src/orders/**, packages/shared/orders.ts
Out of scope: what NOT to touch or add (no new deps, no schema changes, no UI)
Design:      the decisions already made (interfaces, table shape, lock strategy) — or "propose first, then wait"
Acceptance:  testable bullets, incl. the edge case ("duplicate webhook → 200, no second ticket")
Verify:      the command that must pass: pnpm test --filter api
Stop and ask if: you need a new dependency, a migration, or to change a public type
```

## Checklist before you hit enter
- [ ] Did I say **where** (files) and **where not**?
- [ ] Did I make the design decision, or did I outsource it by accident?
- [ ] Is there at least one acceptance criterion that is an **edge case**?
- [ ] Did I say how to verify (a command, not "make sure it works")?
- [ ] Is it small enough to review in 15 minutes (~300 lines)? If not, split it.
- [ ] For anything non-trivial: did I ask for a **plan first** and approve it before code?

## Common loose requests and tighter versions
| Loose | Tight |
|---|---|
| "Add auth" | "Implement `POST /sessions` per ADR-0002 in `apps/api/src/auth/`. Use the existing argon2 dep. Acceptance: wrong password → 401 with no user-enumeration difference in timing or message. No UI." |
| "Make the seat map nicer" | "In `apps/web/src/seatmap/`, show held seats in a distinct state with an accessible label. No new deps. Acceptance: Playwright test checks the label." |
| "Fix the bug" | "Holds sometimes don't expire. Reproduce with a failing test first, show it to me, then fix the root cause." |

## Staying in control during the session
- Ask for a plan → edit the plan → then approve. Cheaper than reviewing the wrong code.
- Review the diff, not the summary. Agent summaries are optimistic.
- Ask "what did you not test?" every time.
- If the agent touches files outside scope, reject and restate the scope; don't let it slide.
- Keep a short log of requests that went sideways in this file (below) — it's your fastest feedback loop.

## Log: requests that went sideways
<!-- date — request — what went wrong — tighter version -->
