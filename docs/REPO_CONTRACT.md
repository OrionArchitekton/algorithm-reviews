# Algorithm Reviews Repo Contract

Date: 2026-06-30

Status: binding repo-local contract.

## Current Name

- `algorithm-reviews`

## Recommended Name

- `algorithm-reviews`

## Role

- `hackathon-project`

## Purpose

`algorithm-reviews` is a Dan personal-brand hackathon project for
DeveloperWeek New York 2026. It is a Next.js app that demonstrates a governed
live-web review agent, fail-closed evidence admission, signed review receipts,
offline demos, and submission proof artifacts.

It is not OAC business ownership, estate platform ownership, Orion Runtime
substrate, shared infra, managed deploy-target, or secret-scope ownership.

## Owns

- repo-local hackathon app source and UI
- governed review pipeline, admissibility policy, and receipt verification demo
- keyless mock and fallback demo behavior
- repo-local tests, screenshots, design notes, Devpost material, and proof assets
- public project documentation and hackathon submission artifacts

## Does Not Own

- business workflow canon for OAC, OIA, OAM, ATS, Cosmocrat, ReplyBy, or Auxo
- estate platform, governance, runtime, shared-infra, or deploy-target status
- reusable estate review infrastructure by implication
- live provider secrets, managed runtime lanes, or scheduled jobs
- broad production fact-checking service ownership outside the repo-local demo

## Allowed Dependencies

- repo-local Next.js, React, TypeScript, Tailwind, Vercel AI SDK, Nimble, Jina,
  Anthropic, and Web Crypto dependencies
- deterministic mock providers and offline demo fixtures
- Vercel public hosting only as the hackathon project's repo-local web surface
- estate doctrine from `orion-estate-audit`
- the personal-brand hackathon and OSS admission note

## Forbidden Logic / Forbidden Ownership

- treating the hackathon demo as durable business product or platform ownership
- adding managed deploy target, scheduled job, or secret scope without separate
  admission
- moving governance-core or runtime substrate semantics into this repo
- expanding the app into OAC, business, shared-infra, or estate tooling ownership
- committing real provider keys or endpoint secrets

## PR Reject Rules

- reject PRs that turn this hackathon repo into business, platform, runtime,
  shared-infra, deploy-target, or secret-scope ownership
- reject PRs that add unmanaged production dependencies or secrets
- reject PRs that weaken keyless build/test/demo behavior
- reject PRs that bypass fail-closed evidence-admission or receipt verification
  claims made by the submission

## Verification

For docs-only contract changes:

```bash
git diff --check
```

For implementation changes, read any relevant Next.js guidance required by
`AGENTS.md`, then run the repo-local `npm run typecheck`, `npm run lint`, `npm
test`, and `npm run build` targets for touched app surfaces.

## Basis

- `AGENTS.md`
- `README.md`
- `docs/DESIGN.md`
- `docs/DEVPOST.md`
- `docs/screenshots/`
- `repos/repo_contract_registry_20260317.csv` in
  `OrionArchitekton/orion-estate-audit`
- `architecture/repo_contracts/dan_mercede_personal_brand_repo_contract_20260318.md`
  in `OrionArchitekton/orion-estate-audit`
- `architecture/PERSONAL_BRAND_HACKATHON_AND_OSS_PROJECT_ADMISSION_NOTE_20260621.md`
  in `OrionArchitekton/orion-estate-audit`
