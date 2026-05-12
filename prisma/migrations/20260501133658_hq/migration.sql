-- CreateTable
CREATE TABLE "GamePlan" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sideId" TEXT NOT NULL,
    "planUrl" TEXT,
    "gameCommanderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlanComment" (
    "id" TEXT NOT NULL,
    "gamePlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" JSONB NOT NULL,
    "replyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlanComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlanSlot" (
    "id" TEXT NOT NULL,
    "gamePlanId" TEXT NOT NULL,
    "slotNumber" TEXT NOT NULL,
    "name" TEXT,
    "weaponry" TEXT,
    "comment" TEXT,
    "spawnPoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlanSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssignedGamePlanSlots" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignedGamePlanSlots_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_WantedGamePlanSlots" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WantedGamePlanSlots_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamePlan_gameId_sideId_key" ON "GamePlan"("gameId", "sideId");

-- CreateIndex
CREATE INDEX "_AssignedGamePlanSlots_B_index" ON "_AssignedGamePlanSlots"("B");

-- CreateIndex
CREATE INDEX "_WantedGamePlanSlots_B_index" ON "_WantedGamePlanSlots"("B");

-- AddForeignKey
ALTER TABLE "GamePlan" ADD CONSTRAINT "GamePlan_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlan" ADD CONSTRAINT "GamePlan_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "Side"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlan" ADD CONSTRAINT "GamePlan_gameCommanderId_fkey" FOREIGN KEY ("gameCommanderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlanComment" ADD CONSTRAINT "GamePlanComment_gamePlanId_fkey" FOREIGN KEY ("gamePlanId") REFERENCES "GamePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlanComment" ADD CONSTRAINT "GamePlanComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlanComment" ADD CONSTRAINT "GamePlanComment_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "GamePlanComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlanSlot" ADD CONSTRAINT "GamePlanSlot_gamePlanId_fkey" FOREIGN KEY ("gamePlanId") REFERENCES "GamePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedGamePlanSlots" ADD CONSTRAINT "_AssignedGamePlanSlots_A_fkey" FOREIGN KEY ("A") REFERENCES "GamePlanSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedGamePlanSlots" ADD CONSTRAINT "_AssignedGamePlanSlots_B_fkey" FOREIGN KEY ("B") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WantedGamePlanSlots" ADD CONSTRAINT "_WantedGamePlanSlots_A_fkey" FOREIGN KEY ("A") REFERENCES "GamePlanSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WantedGamePlanSlots" ADD CONSTRAINT "_WantedGamePlanSlots_B_fkey" FOREIGN KEY ("B") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
