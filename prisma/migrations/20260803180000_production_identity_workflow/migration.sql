CREATE TYPE "ProfileStatus" AS ENUM ('INVITED', 'DRAFT', 'SUBMITTED', 'PUBLISHED', 'RETURNED', 'DEACTIVATED');
ALTER TABLE "Leader" ADD COLUMN "entraObjectId" TEXT;
ALTER TABLE "Leader" ADD COLUMN "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'INVITED';
ALTER TABLE "Leader" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "Leader" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Leader" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Leader" ADD COLUMN "draftData" JSONB;
CREATE UNIQUE INDEX "Leader_entraObjectId_key" ON "Leader"("entraObjectId");

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "invitedBy" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

CREATE TABLE "NotificationJob" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationJob_scheduledAt_sentAt_idx" ON "NotificationJob"("scheduledAt", "sentAt");
