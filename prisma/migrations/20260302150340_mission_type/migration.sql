-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('SG', 'mini');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "missionType" "MissionType" NOT NULL DEFAULT 'SG';
