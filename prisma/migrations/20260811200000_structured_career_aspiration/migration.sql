CREATE TYPE "CareerTimeframe" AS ENUM (
  'ZERO_TO_SIX_MONTHS',
  'SIX_TO_TWELVE_MONTHS',
  'ONE_TO_TWO_YEARS',
  'TWO_PLUS_YEARS'
);

CREATE TABLE "CareerAspiration" (
  "id" TEXT NOT NULL,
  "leaderId" TEXT NOT NULL,
  "targetCapability" TEXT,
  "targetRole" VARCHAR(60),
  "targetTimeframe" "CareerTimeframe",
  "secondaryCapability" TEXT,
  "notes" VARCHAR(300),
  "legacyJourneyBackup" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerAspiration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerAspiration_capability_distinct" CHECK (
    "targetCapability" IS NULL OR
    "secondaryCapability" IS NULL OR
    "targetCapability" <> "secondaryCapability"
  ),
  CONSTRAINT "CareerAspiration_target_capability_allowed" CHECK (
    "targetCapability" IS NULL OR "targetCapability" IN (
      'AI & Autonomous Systems',
      'Data Platforms & Intelligence',
      'Platform Engineering',
      'Product Engineering',
      'Experience Engineering',
      'Enterprise Platforms',
      'Digital Trust',
      'Customer Engineering',
      'Innovation Lab',
      'Product Strategy & Venture Studio'
    )
  ),
  CONSTRAINT "CareerAspiration_secondary_capability_allowed" CHECK (
    "secondaryCapability" IS NULL OR "secondaryCapability" IN (
      'AI & Autonomous Systems',
      'Data Platforms & Intelligence',
      'Platform Engineering',
      'Product Engineering',
      'Experience Engineering',
      'Enterprise Platforms',
      'Digital Trust',
      'Customer Engineering',
      'Innovation Lab',
      'Product Strategy & Venture Studio'
    )
  )
);

CREATE UNIQUE INDEX "CareerAspiration_leaderId_key"
ON "CareerAspiration"("leaderId");

ALTER TABLE "CareerAspiration"
ADD CONSTRAINT "CareerAspiration_leaderId_fkey"
FOREIGN KEY ("leaderId") REFERENCES "Leader"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CareerAspirationSkill" (
  "leaderId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "targetProficiency" SMALLINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerAspirationSkill_pkey" PRIMARY KEY ("leaderId", "skillId"),
  CONSTRAINT "CareerAspirationSkill_target_proficiency_range"
    CHECK ("targetProficiency" BETWEEN 1 AND 5)
);

CREATE INDEX "CareerAspirationSkill_skillId_idx"
ON "CareerAspirationSkill"("skillId");

ALTER TABLE "CareerAspirationSkill"
ADD CONSTRAINT "CareerAspirationSkill_leaderId_fkey"
FOREIGN KEY ("leaderId") REFERENCES "CareerAspiration"("leaderId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareerAspirationSkill"
ADD CONSTRAINT "CareerAspirationSkill_skillId_fkey"
FOREIGN KEY ("skillId") REFERENCES "Skill"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every non-empty legacy journey before removing the old field.
INSERT INTO "CareerAspiration" (
  "id",
  "leaderId",
  "legacyJourneyBackup",
  "createdAt",
  "updatedAt"
)
SELECT
  'career-legacy-' || md5("id"),
  "id",
  "careerJourneyRaw",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Leader"
WHERE NULLIF(BTRIM("careerJourneyRaw"), '') IS NOT NULL;

ALTER TABLE "Leader" DROP COLUMN "careerJourneyRaw";
ALTER TABLE "LeaderSkill" DROP COLUMN "targetProficiency";

CREATE VIEW "v_leader_skill_snapshot" AS
SELECT
  l."id" AS "leader_id",
  l."email" AS "leader_email",
  ls."skillId" AS "skill_id",
  s."name" AS "skill_name",
  s."category" AS "skill_category",
  ls."proficiency" AS "current_proficiency",
  ls."ratingSource"::TEXT AS "rating_source",
  ls."updatedAt" AS "rated_at"
FROM "Leader" l
JOIN "LeaderSkill" ls ON ls."leaderId" = l."id"
JOIN "Skill" s ON s."id" = ls."skillId"
WHERE ls."source" = 'SELF_REPORTED';

CREATE VIEW "v_leader_aspiration" AS
SELECT
  l."id" AS "leader_id",
  l."email" AS "leader_email",
  ca."targetCapability" AS "target_capability",
  ca."targetRole" AS "target_role",
  ca."targetTimeframe"::TEXT AS "target_timeframe",
  ca."secondaryCapability" AS "secondary_capability",
  ca."notes",
  target."skillId" AS "target_skill_id",
  skill."name" AS "target_skill_name",
  current_rating."proficiency" AS "current_proficiency",
  target."targetProficiency" AS "target_proficiency",
  ca."updatedAt" AS "aspiration_updated_at"
FROM "Leader" l
JOIN "CareerAspiration" ca ON ca."leaderId" = l."id"
LEFT JOIN "CareerAspirationSkill" target ON target."leaderId" = l."id"
LEFT JOIN "Skill" skill ON skill."id" = target."skillId"
LEFT JOIN LATERAL (
  SELECT ls."proficiency"
  FROM "LeaderSkill" ls
  WHERE ls."leaderId" = l."id"
    AND ls."skillId" = target."skillId"
    AND ls."source" = 'SELF_REPORTED'
  ORDER BY ls."updatedAt" DESC
  LIMIT 1
) current_rating ON TRUE;
