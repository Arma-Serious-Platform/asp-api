-- AlterTable
ALTER TABLE "MissionVersion"
ADD COLUMN "reviewerId" TEXT;

-- CreateIndex
CREATE INDEX "MissionVersion_reviewerId_idx" ON "MissionVersion"("reviewerId");

-- AddForeignKey
ALTER TABLE "MissionVersion"
ADD CONSTRAINT "MissionVersion_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
