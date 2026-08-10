# Production handoff checklist

> Legacy AWS handoff draft. Azure is now the approved target; use `docs/AZURE_DEPLOYMENT.md` until this checklist is replaced after the first approved Azure deployment.

## Required owner inputs

- AWS CLI/SSO profile authenticated to account `225201316330`.
- Approved AWS region and employee-data residency decision.
- Production hostname, Route 53 hosted-zone ownership, and ACM certificate ARN.
- Microsoft Entra tenant ID, application/client ID, credential, and admin/leader group object IDs.
- Entra redirect URI: `https://<hostname>/api/auth/callback/microsoft-entra-id`.
- Verified Amazon SES sender address/domain and production sending access.
- Employee-profile retention period and deletion/offboarding policy.
- Visibility decision: whether published leader profiles are visible to every authenticated leader or HR only.

## GitHub production environment

Secrets: `AWS_DEPLOY_ROLE_ARN`, `ACM_CERTIFICATE_ARN`, `DATABASE_PASSWORD`, `AUTH_SECRET`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_ISSUER`, `ENTRA_ADMIN_GROUP_ID`, `ENTRA_LEADER_GROUP_ID`, `CRON_SECRET`.

Variables: `AWS_REGION`, `ECR_REPOSITORY=skillmap`, `APP_BASE_URL`, `SES_FROM_EMAIL`.

## Go-live acceptance

1. Deploy staging and verify RDS migrations and `/api/health`.
2. Test one HR admin and 3–5 leader accounts through Entra SSO.
3. Confirm a leader can save a draft, submit all sections, and only modify their own profile.
4. Confirm HR can invite, return, publish, deactivate and inspect audit history.
5. Confirm unpublished profiles never appear in directory, matrix, exports or analytics.
6. Confirm inferred ratings are marked advisory and excluded from default L&D gap decisions.
7. Verify SES delivery, EventBridge processing, CloudWatch logs, RDS restore procedure and ECS rollback.
8. Obtain HR/privacy owner approval for retention and visibility, then record go-live approval.
