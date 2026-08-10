# Tech Leaders Skill Portal

An end-to-end skill intelligence portal for structured profiles, expertise discovery, capability governance, and quarterly growth tracking.

## Local setup

```bash
cp .env.example .env
docker compose up -d db
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Run `npm test`, `npm run build`, or `npm run test:e2e` for verification. Import the source workbook with `npm run import:xlsx -- /path/to/Tech_Leaders_Skill_Gathering.xlsx`.

Production credentials and policy checkpoints are recorded in `docs/DECISIONS.md`.

## Production

Azure is the approved hosting target in Central India. The single production environment is `rg-skillmap-prod`, and its verification URL is [skillmap-prod-web.thankfulbay-54c7b59b.centralindia.azurecontainerapps.io](https://skillmap-prod-web.thankfulbay-54c7b59b.centralindia.azurecontainerapps.io). It uses one always-warm Container Apps replica, revision-based traffic promotion, ACR, private PostgreSQL Flexible Server, Key Vault, Log Analytics, Blob Storage, Azure Communication Services Email, and a scheduled notification job. The former `skillmap-dev-*` resources are retained temporarily only as a rollback source until interactive production verification and a separate decommission approval.

Start with `docs/AZURE_DEPLOYMENT.md`; its deployment script uses ACR remote builds and verifies a zero-traffic candidate revision before promoting it, so local Docker is not required.

The AWS CloudFormation and workflow files are retained only as legacy implementation history and must not be used for new deployments.

Production fails closed when identity configuration is missing. Set `AUTH_DEV_BYPASS=true` only in a local non-production `.env`; it is ignored in production.
