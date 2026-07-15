-- CreateTable
CREATE TABLE "GamePlanCommentAttachment" (
    "id" TEXT NOT NULL,
    "gamePlanCommentId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePlanCommentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GamePlanCommentAttachment_gamePlanCommentId_idx" ON "GamePlanCommentAttachment"("gamePlanCommentId");

-- AddForeignKey
ALTER TABLE "GamePlanCommentAttachment" ADD CONSTRAINT "GamePlanCommentAttachment_gamePlanCommentId_fkey" FOREIGN KEY ("gamePlanCommentId") REFERENCES "GamePlanComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlanCommentAttachment" ADD CONSTRAINT "GamePlanCommentAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
