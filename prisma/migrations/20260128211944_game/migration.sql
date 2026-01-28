/*
  Warnings:

  - You are about to drop the column `date` on the `Weekend` table. All the data in the column will be lost.
  - You are about to drop the `MissionDay` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MissionToMissionDay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MissionDay" DROP CONSTRAINT "MissionDay_weekendId_fkey";

-- DropForeignKey
ALTER TABLE "_MissionToMissionDay" DROP CONSTRAINT "_MissionToMissionDay_A_fkey";

-- DropForeignKey
ALTER TABLE "_MissionToMissionDay" DROP CONSTRAINT "_MissionToMissionDay_B_fkey";

-- AlterTable
ALTER TABLE "Weekend" DROP COLUMN "date";

-- DropTable
DROP TABLE "MissionDay";

-- DropTable
DROP TABLE "Vehicle";

-- DropTable
DROP TABLE "_MissionToMissionDay";

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekendId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "attackSideId" TEXT NOT NULL,
    "defenseSideId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_weekendId_fkey" FOREIGN KEY ("weekendId") REFERENCES "Weekend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_attackSideId_fkey" FOREIGN KEY ("attackSideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_defenseSideId_fkey" FOREIGN KEY ("defenseSideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
