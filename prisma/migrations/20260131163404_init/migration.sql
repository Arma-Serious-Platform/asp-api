-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('APPROVED', 'PENDING_APPROVAL', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "SideType" AS ENUM ('BLUE', 'RED', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'TECH_ADMIN', 'GAME_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SoldierAbility" AS ENUM ('COMMANDER', 'MEDIC', 'SNIPER', 'ANTI_TANK', 'ANTI_AIR', 'HELI_PILOT', 'JET_PILOT', 'TANK_CREW', 'VEHICLE_CREW');

-- CreateEnum
CREATE TYPE "SquadInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'LEAVED');

-- CreateEnum
CREATE TYPE "MissionGameSide" AS ENUM ('BLUE', 'RED', 'GREEN');

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "steamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "abilities" "SoldierAbility"[],
    "squadId" TEXT,
    "activationToken" TEXT,
    "activationTokenExpiresAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isMissionReviewer" BOOLEAN NOT NULL DEFAULT false,
    "resetPasswordToken" TEXT,
    "resetPasswordTokenExpiresAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "bannedUntil" TIMESTAMP(3),
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "telegramUrl" TEXT,
    "discordUrl" TEXT,
    "youtubeUrl" TEXT,
    "twitchUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "sideId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "tag" TEXT NOT NULL,
    "logoId" TEXT,
    "recruiting" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "status" "SquadInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Side" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SideType" NOT NULL DEFAULT 'UNASSIGNED',
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverId" TEXT,

    CONSTRAINT "Side_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '127.0.0.1',
    "port" INTEGER NOT NULL DEFAULT 2302,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionWeaponry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "count" INTEGER NOT NULL,
    "type" "MissionGameSide" NOT NULL,
    "missionVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionWeaponry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "attackSideType" "MissionGameSide" NOT NULL,
    "defenseSideType" "MissionGameSide" NOT NULL,
    "attackSideSlots" INTEGER NOT NULL,
    "defenseSideSlots" INTEGER NOT NULL,
    "attackSideName" TEXT NOT NULL,
    "defenseSideName" TEXT NOT NULL,
    "changesDescription" TEXT,
    "rating" INTEGER,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionComment" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Island" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Island_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorId" TEXT,
    "imageId" TEXT,
    "islandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekendId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionVersionId" TEXT NOT NULL,
    "attackSideId" TEXT NOT NULL,
    "defenseSideId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weekend" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Weekend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_name_key" ON "Squad"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_leaderId_key" ON "Squad"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_tag_key" ON "Squad"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Side_name_key" ON "Side"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Side_leaderId_key" ON "Side"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Island_code_key" ON "Island"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadInvitation" ADD CONSTRAINT "SquadInvitation_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadInvitation" ADD CONSTRAINT "SquadInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Side" ADD CONSTRAINT "Side_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Side" ADD CONSTRAINT "Side_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionWeaponry" ADD CONSTRAINT "MissionWeaponry_missionVersionId_fkey" FOREIGN KEY ("missionVersionId") REFERENCES "MissionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVersion" ADD CONSTRAINT "MissionVersion_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionVersion" ADD CONSTRAINT "MissionVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionComment" ADD CONSTRAINT "MissionComment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionComment" ADD CONSTRAINT "MissionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_islandId_fkey" FOREIGN KEY ("islandId") REFERENCES "Island"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_weekendId_fkey" FOREIGN KEY ("weekendId") REFERENCES "Weekend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_missionVersionId_fkey" FOREIGN KEY ("missionVersionId") REFERENCES "MissionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_attackSideId_fkey" FOREIGN KEY ("attackSideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_defenseSideId_fkey" FOREIGN KEY ("defenseSideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
