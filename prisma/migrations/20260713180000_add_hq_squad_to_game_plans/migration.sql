-- AlterTable
ALTER TABLE "Game" ADD COLUMN "attackHqSquadId" TEXT;
ALTER TABLE "Game" ADD COLUMN "defenseHqSquadId" TEXT;

-- AlterTable
ALTER TABLE "GamePlan" ADD COLUMN "hqSquadId" TEXT;

-- CreateIndex
CREATE INDEX "Game_attackHqSquadId_idx" ON "Game"("attackHqSquadId");
CREATE INDEX "Game_defenseHqSquadId_idx" ON "Game"("defenseHqSquadId");
CREATE INDEX "GamePlan_hqSquadId_idx" ON "GamePlan"("hqSquadId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_attackHqSquadId_fkey" FOREIGN KEY ("attackHqSquadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_defenseHqSquadId_fkey" FOREIGN KEY ("defenseHqSquadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GamePlan" ADD CONSTRAINT "GamePlan_hqSquadId_fkey" FOREIGN KEY ("hqSquadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
