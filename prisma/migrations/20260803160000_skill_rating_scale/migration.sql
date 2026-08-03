-- Convert the old categorical proficiency to the explicit 1-5 scale.
-- Existing records were created by the demo seed, so their provenance is demo.
ALTER TABLE "LeaderSkill" ADD COLUMN "ratingSource" TEXT;
ALTER TABLE "LeaderSkill" ADD COLUMN "proficiency_new" SMALLINT;
ALTER TABLE "LeaderSkill" ADD COLUMN "targetProficiency_new" SMALLINT;

UPDATE "LeaderSkill"
SET "proficiency_new" = CASE "proficiency"::text
  WHEN 'AWARENESS' THEN 1
  WHEN 'WORKING' THEN 2
  WHEN 'PRACTITIONER' THEN 3
  WHEN 'EXPERT' THEN 5
  ELSE 3
END,
"targetProficiency_new" = CASE "targetProficiency"::text
  WHEN 'AWARENESS' THEN 1
  WHEN 'WORKING' THEN 2
  WHEN 'PRACTITIONER' THEN 3
  WHEN 'EXPERT' THEN 5
  ELSE NULL
END,
"ratingSource" = 'demo';

ALTER TABLE "LeaderSkill" DROP COLUMN "proficiency";
ALTER TABLE "LeaderSkill" DROP COLUMN "targetProficiency";
ALTER TABLE "LeaderSkill" RENAME COLUMN "proficiency_new" TO "proficiency";
ALTER TABLE "LeaderSkill" RENAME COLUMN "targetProficiency_new" TO "targetProficiency";
ALTER TABLE "LeaderSkill" ALTER COLUMN "proficiency" SET DEFAULT 3;
ALTER TABLE "LeaderSkill" ALTER COLUMN "proficiency" SET NOT NULL;
ALTER TABLE "LeaderSkill" ALTER COLUMN "ratingSource" SET NOT NULL;
ALTER TABLE "LeaderSkill" ADD CONSTRAINT "LeaderSkill_proficiency_range" CHECK ("proficiency" BETWEEN 1 AND 5);
ALTER TABLE "LeaderSkill" ADD CONSTRAINT "LeaderSkill_target_proficiency_range" CHECK ("targetProficiency" IS NULL OR "targetProficiency" BETWEEN 1 AND 5);
CREATE TYPE "RatingSource" AS ENUM ('self_rated', 'inferred', 'demo');
ALTER TABLE "LeaderSkill" ALTER COLUMN "ratingSource" TYPE "RatingSource" USING "ratingSource"::"RatingSource";
DROP TYPE "Proficiency";
