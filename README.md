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
