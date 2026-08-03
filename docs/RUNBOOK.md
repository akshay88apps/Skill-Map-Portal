# Operations runbook

## Deploy

1. Provision PostgreSQL in the approved region and store `DATABASE_URL` in the secret manager.
2. Configure Entra application credentials and the production callback URL.
3. Build the immutable Docker image, run `prisma migrate deploy` as a release job, then deploy the image.
4. Verify `/`, `/directory`, an authenticated profile, admin RBAC, and mock-disabled integration health.

## Rollback

Route traffic to the previous image. Prisma migrations must be additive; write a forward corrective migration rather than deleting production data. Pause scheduled snapshots and imports during recovery.

## Incident response

Revoke affected credentials, preserve audit logs, identify accessed leader IDs, notify the designated privacy owner, and follow the approved breach process. PII access logs and audit diffs are the primary investigation sources.

## Prepared migration plan

Take an encrypted workbook copy, validate columns without writes, import into staging, review every item below 0.70 confidence, reconcile counts, obtain HR approval, take a database backup, then import production exactly once using email as the idempotency key. The production import is deliberately not executed by this repository.
