/*
  Warnings:

  - You are about to drop the column `fileId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_fileId_fkey";

-- AlterTable
ALTER TABLE "Squad" ADD COLUMN     "logoId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "fileId",
ADD COLUMN     "avatarId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
