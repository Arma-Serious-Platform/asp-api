-- CreateEnum
CREATE TYPE "UserHistoryEventType" AS ENUM (
  'SIGN_UP',
  'SQUAD_JOIN',
  'SQUAD_LEAVE',
  'WARNING',
  'WARNING_REMOVED',
  'TEMP_BAN',
  'PERMANENT_BAN',
  'UNBAN',
  'NICKNAME_CHANGE',
  'ROLE_CHANGE',
  'REVIEWER_CHANGE'
);

-- CreateTable
CREATE TABLE "UserHistoryEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "UserHistoryEventType" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserHistoryEvent_userId_createdAt_idx" ON "UserHistoryEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserHistoryEvent_type_idx" ON "UserHistoryEvent"("type");

-- AddForeignKey
ALTER TABLE "UserHistoryEvent" ADD CONSTRAINT "UserHistoryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHistoryEvent" ADD CONSTRAINT "UserHistoryEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill SIGN_UP from existing users
INSERT INTO "UserHistoryEvent" ("id", "userId", "actorId", "type", "payload", "createdAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  NULL,
  'SIGN_UP'::"UserHistoryEventType",
  '{}'::jsonb,
  u."createdAt"
FROM "User" u;

-- Backfill from existing punishments
INSERT INTO "UserHistoryEvent" ("id", "userId", "actorId", "type", "payload", "createdAt")
SELECT
  gen_random_uuid()::text,
  p."userId",
  p."adminId",
  p."type"::text::"UserHistoryEventType",
  jsonb_strip_nulls(
    jsonb_build_object(
      'reason', p."reason",
      'bannedUntil', CASE WHEN p."bannedUntil" IS NULL THEN NULL ELSE to_jsonb(p."bannedUntil") END,
      'punishmentId', p."id",
      'warningId', p."warningId"
    )
  ),
  p."createdAt"
FROM "UserPunishment" p;
