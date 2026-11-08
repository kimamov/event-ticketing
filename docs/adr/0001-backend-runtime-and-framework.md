# ADR-0001: Backend runtime and framework choice

Status: accepted
Date: 2026-11-08

## Context

We need to choose the JavaScript runtime and the web framework for the server implementation.
These are two separate choices, so the options are grouped by runtime and by framework.
The web app (Next.js) is part of the same repository, so the runtime choice affects it too.

## Options considered

### Runtime

1. **Node.js**
   - Pros: more familiar. Older, more battle-tested and more modular.
   - Cons: substantially worse performance and less built-in tooling. In my benchmarks, even Express on Bun
     outperformed every framework tested on Node.js. <!-- TODO (owner): link the benchmark or add the numbers -->
2. **Bun**
   - Pros: superb performance, even with slower frameworks such as Express. Built-in tooling (test runner,
     package manager, Postgres and Redis clients).
   - Cons: steeper learning curve. Owned by a large company.

### Framework

3. **NestJS**
   - Pros: very structured. Easy to pick up for people coming from classic MVC frameworks such as Symfony and Laravel.
   - Cons: slower than Hono or Fastify. Sometimes too much structure for simple tasks.
4. **Fastify**
   - Pros: fast and mature, with a large plugin ecosystem.
   - Cons: its own request/response model instead of web standards. On Bun, its performance advantage over Hono is minimal.
5. **Hono**
   - Pros: very fast, built on web standards (`Request`/`Response`) and very flexible. Code should be fairly easy to
     port to Go or Rust later.
   - Cons: less structure by default than NestJS.

## Decision

Bun as the runtime and Hono as the framework, to stay as flexible and performant as possible.
Hono wins over Fastify because it stays close to web standards, and on Bun the performance difference between them
is minimal. Both the API and the Next.js web app run on Bun (`bun --bun next ...`), so the repo has one runtime.

## Consequences

- **Positive:** the best possible performance, and the chance to build structures optimized for this project and
  portable to other languages.
- **Negative:** an extra learning curve for Bun and its tooling at the start of the project.
- **Negative:** no conventions out of the box; we have to define the backend project structure ourselves.
- **Single runtime:** one runtime version to pin, upgrade and debug across the API, worker and web app; local, CI and
  production behave the same. The cost: the web app runs Next.js on a path Vercel does not officially support, so
  Next.js upgrades carry more risk than they would on Node.

### Risks and mitigations

| Risk                                                                     | How we notice                                                                        | Response                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| An npm package depends on a Node API that Bun implements incompletely    | Integration tests run on Bun in CI, against real Postgres/Redis                      | Prefer Bun built-ins or web-standard libraries; replace the package; report upstream                |
| No LTS releases: frequent upgrades, occasional regressions               | Bun pinned exactly in `packageManager`; upgrades happen in their own PR with full CI | Upgrade deliberately, never implicitly; roll back the pin if CI or a smoke test fails               |
| Next.js on Bun is maintained by the Bun team, not Vercel                 | Web build and e2e tests run on Bun in CI                                             | Run the web app on Node only (`next` without `--bun`); the API stays on Bun                         |
| A script silently falls back to Node (e.g. `next build` without `--bun`) | Not detected yet                                                                     | Accepted for now; add a CI step without Node on `PATH` if it happens                                |
| Vendor risk: Bun is owned by a single company                            | Release cadence, licence or governance changes                                       | Hono runs on Node, Deno and edge runtimes, so the API can move runtimes without a framework rewrite |

## Revisit when

- A required library or feature (e.g. OpenTelemetry auto-instrumentation in M8) does not work on Bun and has no
  reasonable workaround.
- A Bun upgrade blocks us for more than a week, or a Next.js upgrade does not work on Bun.
- The chosen hosting platform does not support Bun in production.
- Load tests (M3, M6) show the runtime is not the bottleneck, which would remove the main argument for Bun.
