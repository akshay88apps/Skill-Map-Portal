# Operations runbook

## Deploy

1. Provision PostgreSQL in the approved region and store `DATABASE_URL` in the secret manager.
2. Configure Entra application credentials and the production callback URL.
3. Build the immutable Docker image, run `prisma migrate deploy` as a release job, then deploy the image.
4. Verify `/`, `/directory`, an authenticated profile, admin RBAC, and mock-disabled integration health.

### AWS production procedure

1. Authenticate the AWS CLI to account `225201316330` in the approved region.
2. Deploy `infra/bootstrap.yaml` once. Store its role ARN as GitHub environment secret `AWS_DEPLOY_ROLE_ARN`; set `ECR_REPOSITORY=skillmap` and `AWS_REGION` as environment variables.
3. Request/validate an ACM certificate for the production hostname and create its DNS record after the stack returns the ALB hostname.
4. Configure the GitHub `production` environment secrets referenced by `.github/workflows/deploy-production.yml`. Never pass these values through source control or workflow logs.
5. Verify the SES sender identity and request production access if the account is still sandboxed.
6. Run the production workflow. The container applies forward-only Prisma migrations before starting and the ECS deployment circuit breaker rolls back unhealthy tasks.
7. Set the Entra redirect URI to `https://<hostname>/api/auth/callback/microsoft-entra-id`, then test HR and leader group assignments.

CloudFormation protects the database from deletion, retains 14 days of backups, encrypts storage, keeps PostgreSQL private, retains application logs for 90 days, and runs two application tasks by default. The ALB accepts HTTPS only.

## Rollback

Route traffic to the previous image. Prisma migrations must be additive; write a forward corrective migration rather than deleting production data. Pause scheduled snapshots and imports during recovery.

## Incident response

Revoke affected credentials, preserve audit logs, identify accessed leader IDs, notify the designated privacy owner, and follow the approved breach process. PII access logs and audit diffs are the primary investigation sources.

## Prepared migration plan

Take an encrypted workbook copy, validate columns without writes, import into staging, review every item below 0.70 confidence, reconcile counts, obtain HR approval, take a database backup, then import production exactly once using email as the idempotency key. The production import is deliberately not executed by this repository.
