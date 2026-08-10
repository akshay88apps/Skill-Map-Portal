# Architecture

The portal is a Next.js 16 App Router application with React 19, server-rendered discovery surfaces and client components only where interaction requires them. Route handlers expose a REST API validated with Zod. Prisma targets PostgreSQL and preserves raw input beside derived values whenever normalization is lossy.

## Modules

- `app/`: portal, directory, matrix, profile wizard, analytics, admin, and API routes.
- `lib/normalization.ts`: deterministic legacy cleanup and canonical aliases.
- `lib/capabilities.ts`: config-backed category rollups, manual function tags, and multi-capability headcount calculation.
- `lib/ingestion/`: provider-isolated extraction with deterministic fallback and a 0.70 review threshold.
- `lib/integrations/`: interface-first L&D and KPI HTTP connectors; mock URLs are the local default.
- `lib/authz.ts`: server-side role enforcement seam. Production derives roles from Entra claims; tests may supply headers behind a trusted proxy only.
- `scripts/import-xlsx.ts`: repeatable, email-keyed legacy workbook importer.

Audit records capture before/after changes. Optimistic concurrency uses `updatedAt` and returns HTTP 409 for stale writes. Quarterly snapshots remain local even after delivery to the KPI portal. Docker Compose supplies the app and PostgreSQL; CI verifies generation, lint, tests, and production build.

The capability layer is deliberately separate from Practice Area. Seven executive capabilities derive from the category mapping in `data/capability-mapping.json`; three function-based capabilities are admin-managed tags on `Leader`. Rollups de-duplicate within a capability but allow the same leader to count in multiple capabilities.

Skill proficiency is an integer from 1 (Novice) through 5 (Expert), enforced by API validation and database checks. `ratingSource` is required: wizard writes are `self_rated`, tag-derived imports are `inferred`, and seeded showcase records are `demo`. L&D gap decisions exclude non-self-rated values by default and label explicitly included inferred gaps as advisory.

Certification files live outside the relational database in a private Azure Blob Storage container. The web app's user-assigned managed identity has data-plane access; PostgreSQL retains only the blob identifier and safe file metadata. After application-level authorization, the server issues a ten-minute read-only user-delegation SAS URL. Images are metadata-stripped, resized, and normalized to WebP before upload, while signature-validated PDFs are stored unchanged.

## External boundaries

Entra ID, Anthropic, L&D, KPI, email, and Teams configuration enter through environment variables. No production credential is committed. The deterministic extraction path keeps development and tests operational without paid API access.
