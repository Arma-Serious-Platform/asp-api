-- AlterEnum
ALTER TYPE "MissionStatus" ADD VALUE 'PENDING_GAME_APPROVAL';

-- AlterTable
ALTER TABLE "MissionVersion" ADD COLUMN "minSlotsToPlay" INTEGER;
