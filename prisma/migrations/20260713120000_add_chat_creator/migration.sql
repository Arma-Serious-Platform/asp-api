-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "creatorId" TEXT;

-- Backfill creator as earliest joined member per chat
UPDATE "Chat" AS c
SET "creatorId" = sub."userId"
FROM (
  SELECT DISTINCT ON ("chatId") "chatId", "userId"
  FROM "ChatUser"
  ORDER BY "chatId", "joinedAt" ASC
) AS sub
WHERE c."id" = sub."chatId";

-- CreateIndex
CREATE INDEX "Chat_creatorId_idx" ON "Chat"("creatorId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
