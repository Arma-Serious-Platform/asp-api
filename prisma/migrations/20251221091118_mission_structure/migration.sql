/*
  Warnings:

  - You are about to drop the column `blueforSlots` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `civilianSlots` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `independentSlots` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `redforSlots` on the `Mission` table. All the data in the column will be lost.
  - Added the required column `date` to the `Weekend` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MissionGameSide" AS ENUM ('BLUE', 'RED', 'GREEN');

-- AlterTable
ALTER TABLE "Mission" DROP COLUMN "blueforSlots",
DROP COLUMN "civilianSlots",
DROP COLUMN "independentSlots",
DROP COLUMN "redforSlots";

-- AlterTable
ALTER TABLE "Weekend" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "MissionWeaponry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "count" INTEGER NOT NULL,
    "attackWeaponryId" TEXT,
    "defenseWeaponryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionWeaponry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "attackSideType" "MissionGameSide" NOT NULL,
    "defenseSideType" "MissionGameSide" NOT NULL,
    "attackSideSlots" INTEGER NOT NULL,
    "defenseSideSlots" INTEGER NOT NULL,
    "attackSideName" TEXT NOT NULL,
    "defenseSideName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionVersion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MissionWeaponry" ADD CONSTRAINT "MissionWeaponry_attackWeaponryId_fkey" FOREIGN KEY ("attackWeaponryId") REFERENCES "MissionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionWeaponry" ADD CONSTRAINT "MissionWeaponry_defenseWeaponryId_fkey" FOREIGN KEY ("defenseWeaponryId") REFERENCES "MissionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVersion" ADD CONSTRAINT "MissionVersion_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVersion" ADD CONSTRAINT "MissionVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
