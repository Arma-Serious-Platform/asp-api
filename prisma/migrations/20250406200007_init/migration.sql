-- CreateEnum
CREATE TYPE "SideType" AS ENUM ('BLUE', 'RED', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'TECH_ADMIN', 'GAME_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SoldierAbility" AS ENUM ('COMMANDER', 'MEDIC', 'SNIPER', 'ANTI_TANK', 'ANTI_AIR', 'HELI_PILOT', 'JET_PILOT', 'TANK_CREW', 'VEHICLE_CREW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sideId" TEXT,
    "abilities" "SoldierAbility"[],
    "squadId" TEXT,

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

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Side" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SideType" NOT NULL DEFAULT 'UNASSIGNED',
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Side_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authorId" TEXT,
    "description" TEXT NOT NULL,
    "blueforSlots" INTEGER,
    "redforSlots" INTEGER,
    "independentSlots" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionDay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weekend" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Weekend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MissionToMissionDay" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MissionToMissionDay_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_leaderId_key" ON "Squad"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "Side_name_key" ON "Side"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Side_leaderId_key" ON "Side"("leaderId");

-- CreateIndex
CREATE INDEX "_MissionToMissionDay_B_index" ON "_MissionToMissionDay"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Side" ADD CONSTRAINT "Side_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDay" ADD CONSTRAINT "MissionDay_weekendId_fkey" FOREIGN KEY ("weekendId") REFERENCES "Weekend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MissionToMissionDay" ADD CONSTRAINT "_MissionToMissionDay_A_fkey" FOREIGN KEY ("A") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MissionToMissionDay" ADD CONSTRAINT "_MissionToMissionDay_B_fkey" FOREIGN KEY ("B") REFERENCES "MissionDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
