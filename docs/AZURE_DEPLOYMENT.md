# Azure deployment

The Azure deployment lane uses:

- Azure Container Apps for the Next.js container.
- Azure Container Registry with a user-assigned managed identity for image pulls.
- Azure Database for PostgreSQL Flexible Server 16 on a private delegated subnet.
- Azure Key Vault references for the database URL, Auth.js secret, Entra client secret, and cron secret.
- Log Analytics for Container Apps logs.
- Azure Communication Services Email with India data residency and an Azure-managed sender domain.
- Azure Blob Storage (`Standard_LRS`) with a private certifications container; the Container App accesses it through its user-assigned managed identity and viewers receive short-lived, read-only user-delegation SAS URLs.
- A scheduled Container Apps Job that processes queued invitation emails every 15 minutes.
- An ACR remote build, so local Docker is not required.

There is one Azure environment going forward: production. Its resource group is `rg-skillmap-prod`, its resource prefix is `skillmap-prod-*`, and its current Container App URL is:

```text
https://skillmap-prod-web.thankfulbay-54c7b59b.centralindia.azurecontainerapps.io
```

Safe iteration uses Container Apps multiple-revision mode inside this environment. The deployment script pins the serving revision at 100%, creates a new candidate at 0% traffic, checks the candidate's revision-specific `/api/health`, promotes it only after that passes, verifies the canonical URL, and rolls back traffic and the notification job if canonical health fails. The superseded revision is deactivated after success so the footprint returns to one warm replica.

The approved region is Central India. The initial footprint uses PostgreSQL `Standard_B1ms` with 32 GB storage, ACR Basic, locally redundant Blob Storage, one 0.5-vCPU/1-GiB Container Apps replica, a small scheduled job, 30-day log retention, and seven-day database and blob deletion retention. Review current Azure pricing before provisioning. A later production hardening step can add a larger database SKU, high availability, longer backup retention, purge protection, and a custom verified email domain.

At August 2026 public retail rates, budget roughly USD 40–65 per month for a lightly used environment. PostgreSQL compute and storage are about USD 22/month, ACR Basic about USD 5/month, and the always-available Container App is approximately USD 10–35/month depending on how much time it is active versus idle. Key Vault, private DNS, low-volume blob storage and operations, logs, the scheduled job, and invitation email are normally cents to a few dollars at this scale. Actual Sponsorship subscription charges can differ; confirm in the Azure pricing calculator before deployment.

## Prerequisites

1. Azure CLI and Bicep are installed, and `az account show` points to the intended subscription.
2. The subscription can create role assignments, Container Apps, ACR, Key Vault, virtual networks, private DNS, Log Analytics, and PostgreSQL Flexible Server resources.
3. A Microsoft Entra app registration exists. Create a client secret, declare the delegated Microsoft Graph `User.Read` permission, and configure security-group claims so the token contains the admin and leader group object IDs.
4. Use the dedicated production resource group. The script defaults to `rg-skillmap-prod`, refuses a non-`prod` environment, and never deletes a resource group.

## Required values

Export values in your shell. Do not save production credentials in this repository.

```bash
export AZURE_POSTGRES_ADMIN_PASSWORD='<16+ character strong password>'
export AZURE_AUTH_SECRET='<32+ character random value>'
export AZURE_ENTRA_CLIENT_ID='<application-client-id>'
export AZURE_ENTRA_CLIENT_SECRET='<application-client-secret>'
export AZURE_ENTRA_ISSUER='https://login.microsoftonline.com/<tenant-id>/v2.0'
export AZURE_ADMIN_GROUP_ID='<admin-group-object-id>'
export AZURE_LEADER_GROUP_ID='<leader-group-object-id>'
export AZURE_CRON_SECRET='<24+ character random value>'
```

Optional deployment controls:

```bash
export AZURE_DEPLOY_LOCATION='centralindia'
export AZURE_DEPLOY_ENVIRONMENT='prod'
export AZURE_RESOURCE_GROUP='rg-skillmap-prod'
```

Generate suitable random values locally with `openssl rand -hex 32`.

## Validate without provisioning

```bash
az bicep build --file infra/azure/main.bicep
az deployment group validate \
  --resource-group '<an-existing-test-resource-group>' \
  --template-file infra/azure/main.bicep \
  --parameters environmentName=prod \
    postgresAdminPassword="$AZURE_POSTGRES_ADMIN_PASSWORD" \
    authSecret="$AZURE_AUTH_SECRET" \
    entraClientId="$AZURE_ENTRA_CLIENT_ID" \
    entraClientSecret="$AZURE_ENTRA_CLIENT_SECRET" \
    entraIssuer="$AZURE_ENTRA_ISSUER" \
    adminGroupId="$AZURE_ADMIN_GROUP_ID" \
    leaderGroupId="$AZURE_LEADER_GROUP_ID" \
    cronSecret="$AZURE_CRON_SECRET"
```

The first command is entirely local. The second asks Azure Resource Manager to validate the deployment but does not create the declared resources.

## Deploy

```bash
npm test
npm run lint
npm run build
npm run deploy:azure
```

The script registers the Microsoft Communication and Storage resource providers, creates or updates the production resource group and Bicep deployment, adds the production Entra callback without dropping other callbacks, builds the Node 22 image in ACR, performs zero-traffic candidate verification and traffic promotion, updates the scheduled notification job, and waits for the canonical `/api/health`. It prints the generated application URL and Entra callback URI.

The script configures this Web redirect URI on the Entra app registration:

```text
https://<container-app-fqdn>/api/auth/callback/microsoft-entra-id
```

If tenant policy does not permit user consent, an Entra administrator must grant consent for the declared delegated `User.Read` permission. Then test sign-in with one admin and one leader account. Confirm the admin group maps to `ADMIN`, the leader group maps to `LEADER`, and unpublished profiles are not visible to non-admin users.

## 2026-08-11 blue-green promotion

The parallel `rg-skillmap-prod` stack was provisioned in Central India with PostgreSQL `Standard_B1ms`/32 GB, ACR Basic, private networking, Key Vault references, a private `certifications` container, Azure-managed identities, and a single 0.5-vCPU/1-GiB warm web replica. Application image `skillmap:59a000a` is serving from revision `skillmap-prod-web--cutover-59a000a`.

PostgreSQL was migrated with a PostgreSQL 16 custom-format dump and restore. Source and destination counts matched for all application tables: 1 leader, 167 skills, 1 audit log, and zero rows in each of Invitation, NotificationJob, SkillAlias, LeaderSkill, CareerAspiration, CareerAspirationSkill, Project, Certification, Tool, LeaderTool, ReviewItem, and KpiSnapshot. The private certifications containers matched at 0 blobs and 0 bytes. The temporary migration dump and cross-account role assignment were removed after reconciliation.

Automated production verification passes for application/database health, migration status, the sign-in page, Auth.js provider metadata, and protected-route redirection. The old dev callback and resources remain available until interactive Entra role, wizard, image/PDF upload, and signed-URL checks are confirmed and the production environment has completed an agreed stability window. They must not be removed in the same-day provisioning session.

## Operations

View logs:

```bash
az containerapp logs show \
  --name "skillmap-${AZURE_DEPLOY_ENVIRONMENT:-prod}-web" \
  --resource-group "${AZURE_RESOURCE_GROUP:-rg-skillmap-prod}" \
  --follow
```

The container runs `prisma migrate deploy` before starting Next.js. Migrations must remain forward-only and additive.

## External integration checkpoints

The deployment provisions an Azure-managed sender domain and injects `ACS_EMAIL_CONNECTION_STRING` and `ACS_EMAIL_SENDER_ADDRESS` from Azure-managed configuration. Move to a custom verified company domain after DNS ownership and sender policy are approved. L&D, KPI, and Anthropic integrations still require real contracts and credentials before enabling them.
