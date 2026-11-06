# Review rubric — senior bar

Used for every PR, hand-written or agent-written. Claude reviews against this; so should you, before asking.

## Severity
- **blocker**: wrong result, data loss, security hole, double-booking, money bug. Must fix before merge.
- **major**: works today, breaks under load, concurrency, retries, or the next obvious feature.
- **minor**: clarity, naming, a missing test for a non-critical branch.
- **nit**: style. Never blocks.

Every finding states the **failure scenario**: "two requests for seat A1 at the same ms → both get 201".

## What a senior PR has
1. **Correctness under concurrency.** Every read-then-write is either in one transaction with the right lock,
   or guarded by a constraint. You can name the isolation level.
2. **Failure handling.** What happens on timeout, retry, crash between two writes, duplicate message.
3. **Boundaries.** Input validated once at the edge. Domain logic does not import HTTP or DB drivers.
4. **Data model.** Invariants enforced in the DB where possible. Migrations are forward-only and safe on a live table.
5. **Tests that prove the hard part.** The edge case (contention, expiry, duplicate webhook) is tested, not just 200 OK.
   Integration tests use real Postgres/Redis.
6. **Observability.** You can tell from logs/traces why a given request failed.
7. **Scope.** The diff does one thing. No dead code, no speculative abstraction, no unused options.
8. **Explained decisions.** Non-obvious choices have a one-line why-comment or an ADR.

## Signals that you're not at senior level yet (Claude will call these out)
- "It works on my machine" — no test for the race.
- `try { } catch (e) { console.log(e) }` — swallowed errors.
- Business logic in route handlers.
- Floats for money, local time for timestamps.
- A new library for something the platform or an existing dep already does.
- PR description says *what* changed but not *why* or *how it was verified*.

## Review output format
```
Verdict: approve | request changes
Level: below senior | senior | above senior — one sentence why
Findings:
  [blocker] file:line — summary. Failure: <scenario>. Hint: <ladder step, not the fix>
  ...
Not checked: <what the reviewer did not verify>
Agentic coaching (agent PRs only): <how the request could have been tighter + rewritten request>
```
