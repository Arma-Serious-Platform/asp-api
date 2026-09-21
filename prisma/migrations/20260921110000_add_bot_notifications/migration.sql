-- CreateEnum
CREATE TYPE "BotNotificationType" AS ENUM ('WEEKENDS', 'NEWS', 'MANUAL');

-- CreateTable
CREATE TABLE "BotNotification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BotNotificationType" NOT NULL,
    "telegramToken" TEXT,
    "telegramChannelId" TEXT,
    "discordToken" TEXT,
    "discordChannelId" TEXT,
    "status" "State" NOT NULL DEFAULT 'ACTIVE',
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotNotification_type_status_idx" ON "BotNotification"("type", "status");
