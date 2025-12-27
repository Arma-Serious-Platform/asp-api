-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MISSION_REVIEWER';

-- AlterTable
ALTER TABLE "MissionVersion" ADD COLUMN     "changesDescription" TEXT;

-- CreateTable
CREATE TABLE "MissionComment" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MissionComment" ADD CONSTRAINT "MissionComment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionComment" ADD CONSTRAINT "MissionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
