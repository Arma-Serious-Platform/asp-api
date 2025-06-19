/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name]` on the table `Squad` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tag]` on the table `Squad` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tag` to the `Squad` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('APPROVED', 'PENDING_APPROVAL', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'BANNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'TECH_ADMIN', 'GAME_ADMIN', 'USER');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "civilianSlots" INTEGER;

-- AlterTable
ALTER TABLE "Side" ADD COLUMN     "serverId" TEXT;

-- AlterTable
ALTER TABLE "Squad" ADD COLUMN     "activeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "tag" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activationToken" TEXT,
ADD COLUMN     "activationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_name_key" ON "Squad"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_tag_key" ON "Squad"("tag");

-- AddForeignKey
ALTER TABLE "Side" ADD CONSTRAINT "Side_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
