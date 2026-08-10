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

Azure is the approved and deployed hosting target in Central India. The footprint uses one always-warm Container Apps replica, ACR, private PostgreSQL Flexible Server, Key Vault, Log Analytics, and Azure Communication Services Email with a scheduled notification job. Start with `docs/AZURE_DEPLOYMENT.md`; its deployment script uses ACR remote builds, so local Docker is not required.

The AWS CloudFormation and workflow files are retained only as legacy implementation history and must not be used for new deployments.

Production fails closed when identity configuration is missing. Set `AUTH_DEV_BYPASS=true` only in a local non-production `.env`; it is ignored in production.
