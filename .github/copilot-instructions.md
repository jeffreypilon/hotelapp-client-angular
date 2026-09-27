# Copilot instructions — hotelapp-client-angular

## What this repository is

The **Angular frontend** for HotelApp, a hotel booking and guest-management demo built as a
portfolio piece. Target: **Angular 22.1**, TypeScript, Tailwind CSS. A browser-only SPA — no SSR, no
Angular Universal.

HotelApp is deliberately built as **two frontends and two backends against one REST contract**, so
either frontend can be pointed at either backend. The sibling `hotelapp-client-react` implements the
*same screens with the same copy*; divergence between them is a defect, not a stack preference.

> ## Read this before writing any code
>
> **This repository is empty — it contains only a README and a `.gitignore`.** There is no
> `package.json`, no build, no test suite, no lint config, and no source tree yet.
>
> That is deliberate. This project was specified first: **59 specification documents** live in the
> sibling repository `hotelapp-context`, and they are normative. Your first job on any task is to
> read the relevant ones, listed below — not to start scaffolding from habit.
>
> Because nothing is built yet, this file cannot document build or test commands. Those sections say
> "not yet established" and are honest about it. **They will be filled in, and validated by actually
> running them, once the first code exists.**

## Required reading, in `../hotelapp-context/`

All five repositories are opened together by `hotelapp.code-workspace`, so these paths resolve in
this workspace. **Read `context-map.md` first — it is the index and says which document decides
what.**

| Read | When |
|------|------|
| `context-map.md` | Always, first. The index |
| `shared/project-overview.md` | To know whether something is in scope. Authoritative on product scope |
| `shared/api-contracts.md` | **Normative.** Every endpoint: path, method, auth tier, request and response shape, status codes, error codes |
| `shared/data-model.md` | The schema: 11 tables, 5 enums, constraints, indexes |
| `shared/glossary-of-conventions.md` | Before naming anything |
| `shared/domain-glossary.md` | When a domain term is unfamiliar |
| `shared/decision-log.md` | Before proposing a change to a fixed decision — it may already have been reversed once |
| `stacks/angular/ui-specifications.md` | **The most important document for this repo.** 16 screens (S0–S15), every state, exact UI copy |
| `stacks/angular/state-management.md` | NgRx SignalStore patterns, the `401` rule |

**`stacks/angular/` holds this repository's own ten specification documents.** They are the detailed
answer to how this stack satisfies the shared requirements: `architecture-specification.md`,
`coding-standards.md`, `testing-standards.md`, `error-handling.md`, `security-implementation.md`,
`logging-observability.md`, `environment-setup-guide.md`, `devops-pipeline.md`,
`dependency-policy.md`, `module-registry.md`.

## Stay in this stack

This workspace contains five repositories. Four implement the **same REST contract in different
technologies**, and their specification documents deliberately look similar — which makes reading
the wrong one an easy and quiet mistake.

- **Your specifications are `stacks/angular/` and nothing else.** Never read another stack's
  `stacks/` document for implementation guidance.
- `shared/` applies to every repository. `stacks/` applies to exactly one.
- **The specific trap:** `stacks/nodejs/error-handling.md` and `stacks/springboot/error-handling.md`
  are **byte-identical through section 5** and diverge only at section 6. The same is true of the two
  frontends' `ui-specifications.md` (identical §1–2) and both backends' `testing-standards.md`
  (identical §1–5). So the wrong file reads correctly for most of its length and then hands you the
  wrong implementation — Spring exception handling in an Express service, or JUnit patterns in a
  Vitest suite. **Check the path before trusting a section.**
- A `@workspace` search returns hits from all four stacks. The path is the only thing that tells you
  which one you are reading.
- **Never write source code into another repository's folder.** If a task seems to need a change in a
  sibling repository, say so and stop — that is a separate task in a separate repo.

## This repo's specifics

- **Standalone components only.** No `NgModule` declarations for new code. `OnPush` everywhere.
  `provideZonelessChangeDetection()`.
- **Native control flow** (`@if`, `@for`, `@switch`) — never `*ngIf` / `*ngFor`. `@for` always has a
  stable `track`, never `$index`.
- **State: NgRx SignalStore** for feature state, route-provided. **Classic NgRx Store is declined**
  with reasoning in `state-management.md` — do not reintroduce actions/reducers/effects.
- **Forms: Signal forms** (stable in Angular 22). No third-party form or validation library needed.
- **No component library** — no Angular Material, no PrimeNG. **Angular ARIA** (stable in 22)
  supplies accessible dialog, menu, listbox and tab behaviour; Tailwind supplies appearance.
- **`withCredentials: true` in the HTTP interceptor.** `HttpClient` defaults it to `false`, so a
  service bypassing the interceptor sends no cookie.
- **Nothing in `localStorage` or `sessionStorage`.** The session cookie is `HttpOnly`.
- **`ui-specifications.md` sections 1–2 are byte-identical to the React repo's copy.** Changing a
  screen's behaviour or copy in one client without the other is the primary drift risk.

## Fixed decisions — do NOT re-derive, re-propose, or "improve"

These were decided with reasoning, and two were decided *after* being reversed once. Changing any
of them means changing documents in five repositories.

| Decision | Detail |
|----------|--------|
| PostgreSQL | **18.6 specifically.** The schema uses `uuidv7()`, a PostgreSQL 18 core function; 17 will not apply the migrations |
| Auth | **Server-side sessions only.** Opaque token, SHA-256 hashed, `HttpOnly; Secure; SameSite=Lax; Path=/api/v1`. 8h sliding idle, 30d absolute cap, 5-minute write-throttle |
| Auth — what is banned | **No JWTs. No refresh tokens. No `Authorization: Bearer`. No `/auth/refresh` endpoint.** That design was specified and then reversed — see `decision-log.md` entry 2. If you find yourself writing a token interceptor, stop |
| Passwords | bcrypt cost 12, chosen so Node's `bcrypt` and Spring Security's `BCryptPasswordEncoder` verify each other's hashes |
| Errors | RFC 9457 Problem Details, 16 codes. Clients branch on `code`, never on `detail` |
| No overbooking | Enforced by a PostgreSQL **exclusion constraint**, not application logic |
| Money | `numeric(10,2)` → decimal **string** in JSON. **Never** a float or JS `number`, at any layer |
| Pagination | 1-based offset with an envelope. An out-of-range `pageSize` is a `400`, never silently clamped |
| Migrations | **Flyway is the sole DDL executor.** Canonical SQL lives in `hotelapp-context/shared/migrations/` |
| Hosting | **None.** Local dev, Docker Compose later. No deployment, no monitoring, no cloud |

**`api-contracts.md` is normative.** Where this code and that document disagree, the code is wrong.
If the contract genuinely needs to change, change it *there first* — a workaround in one client or
one backend is drift.

## Conventions that apply to every file you write

- **Casing across layers** is fixed in `glossary-of-conventions.md`: `snake_case` in SQL,
  `camelCase` in JSON, `kebab-case` in URLs, `SCREAMING_SNAKE_CASE` for enum values — and enum
  values cross every layer **unchanged**.
- **Domain vocabulary is binding.** `reservation` is the entity and the URL segment; `booking` is
  the act, used only in UI copy. `property` in code; `hotel` is permitted in guest-facing copy only.
  Role labels in UI are exactly "Front Desk" and "Manager".
- **Money is a string end to end.** Parsing it into a `number` is a defect, not a simplification.
- **Dates carry their type in the name**: `_date` for calendar dates, `_at` for timestamps. The
  product is "dates only, no times", so confusing them is a business-logic bug.
- **Commits** follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). A commit
  implementing a contract change should reference the `hotelapp-context` commit that caused it.
- Default branch is `main` in all five repositories.

## Build, test, and lint — NOT YET ESTABLISHED

There is nothing to build yet, so there is nothing to document. **Do not invent commands and do not
assume a conventional scaffold exists.**

When you create the project, follow `stacks/{stack}/environment-setup-guide.md` in
`hotelapp-context` — it specifies the intended scripts, the `.env` contents, and the configuration
mechanism. Those commands are **specified but have never been run**, so treat them as a plan to
validate rather than as verified fact.

**Once the first code exists, this file should be rewritten** with commands that have actually been
executed, in the order that works, including any errors and their workarounds.

## Trust these instructions

**Trust this file first.** Search the codebase only when the information here is incomplete, or when
you find it to be in error. If you do find an error, say so — do not quietly work around it.

The specification documents named above are the authority on *what* to build. This file is the
authority on *where to look*. Neither is a substitute for reading the other.
