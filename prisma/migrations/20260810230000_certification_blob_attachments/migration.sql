ALTER TABLE "Certification"
ADD COLUMN "attachmentBlobName" TEXT,
ADD COLUMN "attachmentContentType" TEXT,
ADD COLUMN "attachmentFileName" TEXT,
ADD COLUMN "attachmentSize" INTEGER,
DROP COLUMN IF EXISTS "imageData",
DROP COLUMN IF EXISTS "imageMimeType",
DROP COLUMN IF EXISTS "imageFileName",
DROP COLUMN IF EXISTS "imageSize";

CREATE UNIQUE INDEX "Certification_attachmentBlobName_key"
ON "Certification"("attachmentBlobName");
