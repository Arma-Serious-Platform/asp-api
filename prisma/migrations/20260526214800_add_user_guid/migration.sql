-- AlterTable
ALTER TABLE "User" ADD COLUMN "GUID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_GUID_key" ON "User"("GUID");
