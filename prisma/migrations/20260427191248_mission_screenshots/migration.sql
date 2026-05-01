-- CreateTable
CREATE TABLE "MissionVersionScreenshot" (
    "id" TEXT NOT NULL,
    "missionVersionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "side" "MissionGameSide" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionVersionScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionVersionScreenshot_missionVersionId_side_idx" ON "MissionVersionScreenshot"("missionVersionId", "side");

-- AddForeignKey
ALTER TABLE "MissionVersionScreenshot" ADD CONSTRAINT "MissionVersionScreenshot_missionVersionId_fkey" FOREIGN KEY ("missionVersionId") REFERENCES "MissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVersionScreenshot" ADD CONSTRAINT "MissionVersionScreenshot_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
