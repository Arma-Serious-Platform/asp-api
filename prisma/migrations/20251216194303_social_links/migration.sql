/*
  Warnings:

  - A unique constraint covering the columns `[steamId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordUrl" TEXT,
ADD COLUMN     "steamId" TEXT,
ADD COLUMN     "telegramUrl" TEXT,
ADD COLUMN     "twitchUrl" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");
