-- CreateEnum
CREATE TYPE "TribunalComplaintStatus" AS ENUM ('OPEN', 'PUNISHED');

-- CreateEnum
CREATE TYPE "TribunalPunishmentKind" AS ENUM ('NONE', 'WARNING', 'TEMP_BAN', 'PERMANENT_BAN');

-- CreateTable
CREATE TABLE "TribunalComplaint" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "ruleNumber" TEXT NOT NULL,
    "violatedAt" TIMESTAMP(3) NOT NULL,
    "gameId" TEXT,
    "description" TEXT NOT NULL,
    "status" "TribunalComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "punishmentKind" "TribunalPunishmentKind" NOT NULL DEFAULT 'NONE',
    "punishmentId" TEXT,
    "bannedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TribunalComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TribunalMessage" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TribunalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TribunalComplaint_number_key" ON "TribunalComplaint"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TribunalComplaint_punishmentId_key" ON "TribunalComplaint"("punishmentId");

-- CreateIndex
CREATE INDEX "TribunalComplaint_authorId_idx" ON "TribunalComplaint"("authorId");

-- CreateIndex
CREATE INDEX "TribunalComplaint_targetUserId_idx" ON "TribunalComplaint"("targetUserId");

-- CreateIndex
CREATE INDEX "TribunalComplaint_gameId_idx" ON "TribunalComplaint"("gameId");

-- CreateIndex
CREATE INDEX "TribunalComplaint_status_idx" ON "TribunalComplaint"("status");

-- CreateIndex
CREATE INDEX "TribunalComplaint_createdAt_idx" ON "TribunalComplaint"("createdAt");

-- CreateIndex
CREATE INDEX "TribunalMessage_complaintId_createdAt_idx" ON "TribunalMessage"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "TribunalMessage_authorId_idx" ON "TribunalMessage"("authorId");

-- AddForeignKey
ALTER TABLE "TribunalComplaint" ADD CONSTRAINT "TribunalComplaint_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalComplaint" ADD CONSTRAINT "TribunalComplaint_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalComplaint" ADD CONSTRAINT "TribunalComplaint_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalComplaint" ADD CONSTRAINT "TribunalComplaint_punishmentId_fkey" FOREIGN KEY ("punishmentId") REFERENCES "UserPunishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalMessage" ADD CONSTRAINT "TribunalMessage_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "TribunalComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TribunalMessage" ADD CONSTRAINT "TribunalMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
