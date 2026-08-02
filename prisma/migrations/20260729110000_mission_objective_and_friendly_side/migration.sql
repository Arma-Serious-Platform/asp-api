-- CreateEnum (if not already applied; MissionObjective may already exist in schema-only state)
DO $$ BEGIN
  CREATE TYPE "MissionObjective" AS ENUM ('ATTACK_DEFEND', 'ENCOUTER_BATTLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable Mission
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "missionObjective" "MissionObjective" NOT NULL DEFAULT 'ATTACK_DEFEND';
UPDATE "Mission" SET "missionObjective" = 'ATTACK_DEFEND' WHERE "missionObjective" IS NULL;

-- AlterTable MissionVersion
ALTER TABLE "MissionVersion" ADD COLUMN IF NOT EXISTS "friendlySideType" "MissionGameSide";
ALTER TABLE "MissionVersion" ADD COLUMN IF NOT EXISTS "friendlyTo" "MissionGameSide";
ALTER TABLE "MissionVersion" ADD COLUMN IF NOT EXISTS "friendlySideSlots" INTEGER;
ALTER TABLE "MissionVersion" ADD COLUMN IF NOT EXISTS "missionFriendlySlots" JSONB;
ALTER TABLE "MissionVersion" ADD COLUMN IF NOT EXISTS "friendlySideName" TEXT;

-- AlterTable GamePlanSlot
ALTER TABLE "GamePlanSlot" ADD COLUMN IF NOT EXISTS "missionGameSide" "MissionGameSide";
