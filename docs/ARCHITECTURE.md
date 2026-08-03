# Architecture

The portal is a Next.js 14 App Router application with server-rendered discovery surfaces and client components only where interaction requires them. Route handlers expose a REST API validated with Zod. Prisma targets PostgreSQL and preserves raw input beside derived values whenever normalization is lossy.

## Modules

- `app/`: portal, directory, matrix, profile wizard, analytics, admin, and API routes.
- `lib/normalization.ts`: deterministic legacy cleanup and canonical aliases.
- `lib/ingestion/`: provider-isolated extraction with deterministic fallback and a 0.70 review threshold.
- `lib/integrations/`: interface-first L&D and KPI HTTP connectors; mock URLs are the local default.
- `lib/authz.ts`: server-side role enforcement seam. Production derives roles from Entra claims; tests may supply headers behind a trusted proxy only.
- `scripts/import-xlsx.ts`: repeatable, email-keyed legacy workbook importer.

Audit records capture before/after changes. Optimistic concurrency uses `updatedAt` and returns HTTP 409 for stale writes. Quarterly snapshots remain local even after delivery to the KPI portal. Docker Compose supplies the app and PostgreSQL; CI verifies generation, lint, tests, and production build.

## External boundaries

Entra ID, Anthropic, L&D, KPI, email, and Teams configuration enter through environment variables. No production credential is committed. The deterministic extraction path keeps development and tests operational without paid API access.
