/*
  Warnings:

  - You are about to drop the column `attackWeaponryId` on the `MissionWeaponry` table. All the data in the column will be lost.
  - You are about to drop the column `defenseWeaponryId` on the `MissionWeaponry` table. All the data in the column will be lost.
  - Added the required column `missionVersionId` to the `MissionWeaponry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `MissionWeaponry` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MissionWeaponry" DROP CONSTRAINT "MissionWeaponry_attackWeaponryId_fkey";

-- DropForeignKey
ALTER TABLE "MissionWeaponry" DROP CONSTRAINT "MissionWeaponry_defenseWeaponryId_fkey";

-- AlterTable
ALTER TABLE "MissionWeaponry" DROP COLUMN "attackWeaponryId",
DROP COLUMN "defenseWeaponryId",
ADD COLUMN     "missionVersionId" TEXT NOT NULL,
ADD COLUMN     "type" "MissionGameSide" NOT NULL;

-- AddForeignKey
ALTER TABLE "MissionWeaponry" ADD CONSTRAINT "MissionWeaponry_missionVersionId_fkey" FOREIGN KEY ("missionVersionId") REFERENCES "MissionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
