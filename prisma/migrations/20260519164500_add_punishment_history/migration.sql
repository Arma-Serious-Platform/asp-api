-- CreateEnum
CREATE TYPE "UserPunishmentType" AS ENUM ('WARNING', 'WARNING_REMOVED', 'TEMP_BAN', 'PERMANENT_BAN', 'UNBAN');

-- AlterTable
ALTER TABLE "UserWarning" ADD COLUMN "removeReason" TEXT,
ADD COLUMN "removedAt" TIMESTAMP(3),
ADD COLUMN "removedById" TEXT;

-- CreateTable
CREATE TABLE "UserPunishment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "warningId" TEXT,
    "type" "UserPunishmentType" NOT NULL,
    "reason" TEXT,
    "bannedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPunishment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWarning_removedById_idx" ON "UserWarning"("removedById");

-- CreateIndex
CREATE INDEX "UserWarning_removedAt_idx" ON "UserWarning"("removedAt");

-- CreateIndex
CREATE INDEX "UserPunishment_userId_idx" ON "UserPunishment"("userId");

-- CreateIndex
CREATE INDEX "UserPunishment_adminId_idx" ON "UserPunishment"("adminId");

-- CreateIndex
CREATE INDEX "UserPunishment_warningId_idx" ON "UserPunishment"("warningId");

-- CreateIndex
CREATE INDEX "UserPunishment_type_idx" ON "UserPunishment"("type");

-- AddForeignKey
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPunishment" ADD CONSTRAINT "UserPunishment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPunishment" ADD CONSTRAINT "UserPunishment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPunishment" ADD CONSTRAINT "UserPunishment_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES "UserWarning"("id") ON DELETE SET NULL ON UPDATE CASCADE;
