-- CreateEnum
CREATE TYPE "NotificationGroup" AS ENUM (
  'CHAT',
  'HEADQUARTERS',
  'SQUAD',
  'MISSIONS',
  'ANNOUNCEMENTS',
  'PUNISHMENTS'
);

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'NEW_CHAT_MESSAGE',
  'NEW_MISSION_COMMENT',
  'NEW_PLAN_COMMENT',
  'SQUAD_INVITE',
  'SQUAD_JOIN_REQUEST',
  'WARNING',
  'WARNING_REMOVED',
  'TEMP_BAN',
  'PERMANENT_BAN',
  'UNBAN',
  'WEEKEND_PUBLISHED'
);

-- CreateTable
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "NotificationType" NOT NULL,
  "group" "NotificationGroup" NOT NULL,
  "targetId" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "group" "NotificationGroup" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_group_readAt_idx" ON "Notification"("recipientId", "group", "readAt");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_group_key" ON "NotificationPreference"("userId", "group");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
