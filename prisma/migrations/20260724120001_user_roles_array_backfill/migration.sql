-- AlterTable: add roles array
ALTER TABLE "User" ADD COLUMN "roles" "UserRole"[] NOT NULL DEFAULT ARRAY['USER']::"UserRole"[];

-- Backfill from existing scalar role
UPDATE "User" SET "roles" = ARRAY["role"]::"UserRole"[];

-- Backfill mission reviewers into roles
UPDATE "User"
SET "roles" = array_append("roles", 'MISSION_REVIEWER'::"UserRole")
WHERE "isMissionReviewer" = true
  AND NOT ('MISSION_REVIEWER' = ANY ("roles"));

-- Drop old columns
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" DROP COLUMN "isMissionReviewer";
