# Decision log

- 2026-08-03 — Kept Next.js at the brief's 14.x line for compatibility and predictable deployment.
- 2026-08-03 — Used REST route handlers and Zod because external portals can consume a conventional contract without sharing TypeScript.
- 2026-08-03 — Replaced categorical proficiency with an explicit constrained 1–5 scale (Novice through Expert) and required `ratingSource`; wizard submissions are `self_rated`, legacy primary/secondary defaults are `inferred` (4/2), existing seed values are backfilled `demo`, and inferred gaps are advisory rather than decision-grade.
- 2026-08-03 — Added deterministic ingestion as an offline fallback; paid AI improves extraction but is not a development dependency.
- 2026-08-03 — Used a strict 0.70 confidence gate and retained raw text for traceability.
- 2026-08-03 — Built L&D and KPI integrations as interfaces with HTTP implementations and mock defaults until real contracts arrive.
- 2026-08-03 — Created representative demo records because the referenced XLSX is not present in the workspace; the importer accepts it unchanged when supplied.
- 2026-08-03 — Kept email validation domain-agnostic to support both observed company domains.
- 2026-08-03 — Dependency audit reports advisories in the brief-mandated Next.js 14 line and unpatched `xlsx`; production launch is gated on a framework upgrade/security acceptance, and workbook imports must remain admin-only with size limits.

## HUMAN INPUT NEEDED

- Confirm the hosting target and paid AI budget ceiling before production provisioning.
- Confirm Microsoft Entra ID is the production identity source and provide tenant/application details.
- Spot-review imported AI records before raising the auto-commit confidence policy.
- Provide L&D and KPI API contracts/credentials to replace mocks.
- Approve go-live and define employee-PII retention before real data is loaded.
