-- AlterTable
ALTER TABLE "User" ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserPunishment" ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false;
