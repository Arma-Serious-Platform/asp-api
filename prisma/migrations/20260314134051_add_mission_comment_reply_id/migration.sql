-- AlterTable
ALTER TABLE "MissionComment" ADD COLUMN     "replyId" TEXT;

-- AddForeignKey
ALTER TABLE "MissionComment" ADD CONSTRAINT "MissionComment_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "MissionComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
